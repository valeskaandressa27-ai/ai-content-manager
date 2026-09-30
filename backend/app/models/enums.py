from enum import Enum


class ContentType(str, Enum):
    instagram_caption = "instagram_caption"
    product_description = "product_description"
    ad = "ad"
    email = "email"
    website_text = "website_text"
    title = "title"
    promo_cta = "promo_cta"
    blog_post = "blog_post"
    whatsapp_message = "whatsapp_message"
    video_script = "video_script"


class ContentStatus(str, Enum):
    draft = "draft"
    saved = "saved"


class GenerationStatus(str, Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class ContentLength(str, Enum):
    short = "short"
    medium = "medium"
    long = "long"


CAMPAIGN_GENERATION_TYPE = "campaign"
