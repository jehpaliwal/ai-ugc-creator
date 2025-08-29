import os
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
	print("Warning: OPENAI_API_KEY not set. Put it in backend/.env")

# OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# FastAPI app
app = FastAPI(title="AI UGC Creator", version="0.1.0")

# CORS for Vite dev server
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Static images dir
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
IMAGES_DIR = STATIC_DIR / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Health
@app.get("/health")
def health():
	return {"status": "ok"}

# ----- Schemas -----
class GenerateTextRequest(BaseModel):
	prompt: str
	platform: Optional[str] = None
	tone: Optional[str] = None
	length: Optional[str] = None  # "short"|"medium"|"long"

class GenerateTextResponse(BaseModel):
	text: str

class GenerateImageRequest(BaseModel):
	prompt: str
	style: Optional[str] = None      # "selfie"|"product"|"demo"
	aspectRatio: Optional[str] = "square"  # "square"|"portrait"|"landscape"

class GenerateImageResponse(BaseModel):
	url: str
	b64: str

# ----- Helpers -----
def build_caption_prompt(req: GenerateTextRequest) -> str:
	base = f"Create a UGC-style social caption based on: \"{req.prompt}\"."
	if req.platform:
		base += f" Platform: {req.platform}."
	if req.tone:
		base += f" Tone: {req.tone}."
	if req.length:
		base += f" Length: {req.length}."
	base += " Use an authentic voice, light emojis, avoid forced hashtags."
	return base

def map_aspect_to_size(aspect: Optional[str]) -> str:
	if aspect == "portrait":
		return "1024x1792"
	if aspect == "landscape":
		return "1792x1024"
	return "1024x1024"

def add_style_hint(prompt: str, style: Optional[str]) -> str:
	if not style:
		return prompt
	hints = {
		"selfie": "smartphone selfie, casual lighting, authentic, handheld perspective",
		"product": "studio product shot, plain background, soft shadows, realistic",
		"demo": "hands-on demo scene, natural setting, realistic lighting",
	}
	h = hints.get((style or "").lower())
	return f"{prompt}. {h}" if h else prompt

def save_b64_image_to_file(b64_data: str) -> str:
	img_bytes = base64.b64decode(b64_data)
	filename = f"ugc_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}.png"
	path = IMAGES_DIR / filename
	with open(path, "wb") as f:
		f.write(img_bytes)
	return f"/static/images/{filename}"

def _mock_png_b64():
	return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBCd3pF1kAAAAASUVORK5CYII="

# ----- Routes -----
@app.post("/generate-text", response_model=GenerateTextResponse)
def generate_text(req: GenerateTextRequest):
	if not req.prompt or not req.prompt.strip():
		raise HTTPException(status_code=400, detail="Prompt is required")
	try:
		prompt = build_caption_prompt(req)
		resp = client.chat.completions.create(
			model="gpt-4o-mini",
			messages=[
				{"role": "system", "content": "You are a UGC creator writing short, authentic captions."},
				{"role": "user", "content": prompt},
			],
			temperature=0.8,
			max_tokens=220,
		)
		text = (resp.choices[0].message.content or "").strip()
		return GenerateTextResponse(text=text)
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Text generation failed: {e}")

@app.post("/generate-image", response_model=GenerateImageResponse)
def generate_image(req: GenerateImageRequest):
	if not req.prompt or not req.prompt.strip():
		raise HTTPException(status_code=400, detail="Prompt is required")
	try:
		# Mock path (for dev without billing)
		MOCK_IMAGES = (os.getenv("MOCK_IMAGES") or "false").lower() == "true"
		if MOCK_IMAGES:
			b64 = _mock_png_b64()
			rel_url = save_b64_image_to_file(b64)
			abs_url = f"http://localhost:8000{rel_url}"
			return GenerateImageResponse(url=abs_url, b64=b64)

		size = map_aspect_to_size(req.aspectRatio)
		prompt = add_style_hint(req.prompt, req.style)
		img = client.images.generate(
			model="gpt-image-1",
			prompt=prompt,
			size=size,
		)
		b64 = img.data[0].b64_json
		rel_url = save_b64_image_to_file(b64)
		abs_url = f"http://localhost:8000{rel_url}"
		return GenerateImageResponse(url=abs_url, b64=b64)
	except Exception as e:
		# Graceful fallback if billing is hit during dev
		msg = str(e)
		if "billing_hard_limit_reached" in msg:
			b64 = _mock_png_b64()
			rel_url = save_b64_image_to_file(b64)
			abs_url = f"http://localhost:8000{rel_url}"
			return GenerateImageResponse(url=abs_url, b64=b64)
		raise HTTPException(status_code=500, detail=f"Image generation failed: {e}")