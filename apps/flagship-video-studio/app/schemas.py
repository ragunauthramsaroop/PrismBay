from typing import Literal
from pydantic import BaseModel, Field, field_validator

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    client: str = Field(default='', max_length=100)
    description: str = Field(default='', max_length=1500)
    format: Literal['landscape', 'portrait', 'square', 'cinema-4k'] = 'landscape'
    accent: str = '#7AE3CE'
    background: str = '#0B1424'
    script: str = Field(default='', max_length=30000)

    @field_validator('accent', 'background')
    @classmethod
    def color(cls, v):
        import re
        if not re.fullmatch(r'#[0-9a-fA-F]{6}', v):
            raise ValueError('Use a six-digit hex color')
        return v

class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    client: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=1500)
    format: Literal['landscape', 'portrait', 'square', 'cinema-4k'] | None = None
    accent: str | None = None
    background: str | None = None
    script: str | None = Field(default=None, max_length=30000)

class ShotCreate(BaseModel):
    kind: Literal['title', 'photo', 'video', 'end']
    headline: str = Field(default='', max_length=180)
    subtitle: str = Field(default='', max_length=350)
    duration: float = Field(default=4, ge=1, le=30)
    asset_id: str | None = None

class PositionUpdate(BaseModel):
    positions: list[str]

class CaptionUpload(BaseModel):
    srt: str = Field(max_length=100000)

class ChatwootSend(BaseModel):
    conversation_id: int = Field(gt=0)
    message: str = Field(min_length=1, max_length=5000)

class PlaneCreate(BaseModel):
    project_id: str
    name: str = Field(min_length=1)
    description_html: str = ''
