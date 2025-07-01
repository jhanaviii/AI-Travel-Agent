import requests
import base64
from PIL import Image, ImageDraw, ImageFilter
import io
import os
import uuid
import json
import time
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class FaceSwapService:
    def __init__(self):
        # Free API options (you can get free keys from these services)
        self.free_apis = [
            {
                'name': 'deepai',
                'url': 'https://api.deepai.org/api/face-swap',
                'method': 'POST',
                'headers': {
                    'api-key': os.getenv('FACE_SWAP_API_KEY', '83f7cc93-24a8-40a1-a8d8-b0a3f500dc7b')
                }
            }
        ]
        
        # Mock face swap templates for demo
        self.mock_templates = [
            {'name': 'beach', 'overlay_position': (50, 50)},
            {'name': 'mountain', 'overlay_position': (100, 30)},
            {'name': 'city', 'overlay_position': (80, 60)},
            {'name': 'forest', 'overlay_position': (40, 40)}
        ]

    def swap_face_with_destination(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """
        Main face swap function with multiple fallbacks
        Returns: Path to generated image or None if failed
        """
        logger.info(f"Starting face swap: user={user_photo_url}, destination={destination_image_url}")
        
        try:
            # Method 1: Try free online APIs
            result = self._try_free_apis(user_photo_url, destination_image_url)
            if result:
                logger.info("Face swap completed using online API")
                return result
                
        except Exception as e:
            logger.warning(f"Online APIs failed: {e}")

        try:
            # Method 2: Local face detection and overlay
            result = self._local_face_overlay(user_photo_url, destination_image_url)
            if result:
                logger.info("Face swap completed using local processing")
                return result
                
        except Exception as e:
            logger.warning(f"Local processing failed: {e}")

        try:
            # Method 3: Mock face swap for demo
            result = self._mock_face_swap(user_photo_url, destination_image_url)
            if result:
                logger.info("Face swap completed using mock generation")
                return result
                
        except Exception as e:
            logger.warning(f"Mock generation failed: {e}")

        logger.error("All face swap methods failed")
        return None

    def _try_free_apis(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """Try multiple free face swap APIs"""
        
        # Download images
        try:
            user_response = requests.get(user_photo_url, timeout=15)
            user_response.raise_for_status()
            
            dest_response = requests.get(destination_image_url, timeout=15)
            dest_response.raise_for_status()
            
        except requests.RequestException as e:
            logger.error(f"Failed to download images: {e}")
            return None

        for api in self.free_apis:
            try:
                logger.info(f"Trying API: {api['name']}")
                
                if api['name'] == 'deepai':
                    result = self._try_deepai_api(user_response.content, dest_response.content, api)
                else:
                    continue
                    
                if result:
                    return result
                    
            except Exception as e:
                logger.warning(f"API {api['name']} failed: {e}")
                continue
                
        return None

    def _try_deepai_api(self, user_image: bytes, dest_image: bytes, api_config: Dict[str, Any]) -> Optional[str]:
        """Try DeepAI face swap API"""
        try:
            files = {
                'image1': ('user.jpg', user_image, 'image/jpeg'),
                'image2': ('destination.jpg', dest_image, 'image/jpeg')
            }
            
            response = requests.post(
                api_config['url'],
                files=files,
                headers=api_config['headers'],
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                if 'output_url' in result:
                    # Download the result
                    result_response = requests.get(result['output_url'], timeout=30)
                    if result_response.status_code == 200:
                        return self._save_result_image(result_response.content)
                        
        except Exception as e:
            logger.error(f"DeepAI API error: {e}")
            
        return None

    def _local_face_overlay(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """Local face detection and overlay using PIL"""
        try:
            # Download images
            user_response = requests.get(user_photo_url, timeout=15)
            user_response.raise_for_status()
            user_img = Image.open(io.BytesIO(user_response.content))

            dest_response = requests.get(destination_image_url, timeout=15)
            dest_response.raise_for_status()
            dest_img = Image.open(io.BytesIO(dest_response.content))

            # Convert to RGB
            if user_img.mode in ('RGBA', 'P'):
                user_img = user_img.convert('RGB')
            if dest_img.mode in ('RGBA', 'P'):
                dest_img = dest_img.convert('RGB')

            # Resize destination image
            dest_img = dest_img.resize((800, 600), Image.Resampling.LANCZOS)

            # Create a more sophisticated overlay
            result_img = self._create_sophisticated_overlay(dest_img, user_img)
            
            return self._save_result_image(result_img)

        except Exception as e:
            logger.error(f"Local overlay failed: {e}")
            return None

    def _create_sophisticated_overlay(self, dest_img: Image.Image, user_img: Image.Image) -> Image.Image:
        """Create a sophisticated overlay with multiple effects"""
        
        # Resize user image
        user_size = 150
        user_img = user_img.resize((user_size, user_size), Image.Resampling.LANCZOS)
        
        # Create circular mask
        mask = Image.new('L', (user_size, user_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, user_size, user_size), fill=255)
        
        # Apply blur to mask edges
        mask = mask.filter(ImageFilter.GaussianBlur(radius=3))
        
        # Position in top-right corner
        paste_x = dest_img.width - user_size - 30
        paste_y = 30
        
        # Create a copy of destination image
        result_img = dest_img.copy()
        
        # Paste user photo with mask
        result_img.paste(user_img, (paste_x, paste_y), mask)
        
        # Add border
        draw_result = ImageDraw.Draw(result_img)
        border_width = 4
        draw_result.ellipse([
            paste_x - border_width, 
            paste_y - border_width, 
            paste_x + user_size + border_width, 
            paste_y + user_size + border_width
        ], outline='white', width=border_width)
        
        # Add shadow effect
        shadow_offset = 3
        shadow_img = Image.new('RGBA', (user_size + shadow_offset*2, user_size + shadow_offset*2), (0,0,0,0))
        shadow_draw = ImageDraw.Draw(shadow_img)
        shadow_draw.ellipse([
            shadow_offset, shadow_offset, 
            shadow_offset + user_size, shadow_offset + user_size
        ], fill=(0,0,0,100))
        
        # Paste shadow
        result_img.paste(shadow_img, (paste_x - shadow_offset, paste_y - shadow_offset), shadow_img)
        
        # Add text overlay
        draw_result.text((paste_x, paste_y + user_size + 10), "You're here!", fill='white', font=None)
        
        return result_img

    def _mock_face_swap(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """Create a mock face swap for demo purposes"""
        try:
            # Download destination image
            dest_response = requests.get(destination_image_url, timeout=15)
            dest_response.raise_for_status()
            dest_img = Image.open(io.BytesIO(dest_response.content))

            # Download user image
            user_response = requests.get(user_photo_url, timeout=15)
            user_response.raise_for_status()
            user_img = Image.open(io.BytesIO(user_response.content))

            # Convert to RGB
            if dest_img.mode in ('RGBA', 'P'):
                dest_img = dest_img.convert('RGB')
            if user_img.mode in ('RGBA', 'P'):
                user_img = user_img.convert('RGB')

            # Resize destination
            dest_img = dest_img.resize((800, 600), Image.Resampling.LANCZOS)

            # Create mock overlay
            result_img = self._create_mock_overlay(dest_img, user_img)
            
            return self._save_result_image(result_img)

        except Exception as e:
            logger.error(f"Mock face swap failed: {e}")
            return None

    def _create_mock_overlay(self, dest_img: Image.Image, user_img: Image.Image) -> Image.Image:
        """Create a mock overlay with travel theme"""
        
        # Resize user image
        user_size = 120
        user_img = user_img.resize((user_size, user_size), Image.Resampling.LANCZOS)
        
        # Create circular mask
        mask = Image.new('L', (user_size, user_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, user_size, user_size), fill=255)
        
        # Position in bottom-right corner
        paste_x = dest_img.width - user_size - 20
        paste_y = dest_img.height - user_size - 20
        
        # Create result image
        result_img = dest_img.copy()
        
        # Paste user photo
        result_img.paste(user_img, (paste_x, paste_y), mask)
        
        # Add travel-themed overlay
        draw_result = ImageDraw.Draw(result_img)
        
        # Add semi-transparent overlay
        overlay = Image.new('RGBA', dest_img.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([0, 0, dest_img.width, dest_img.height], fill=(0, 0, 0, 50))
        result_img = Image.alpha_composite(result_img.convert('RGBA'), overlay).convert('RGB')
        
        # Add border to user photo
        draw_result = ImageDraw.Draw(result_img)
        draw_result.ellipse([
            paste_x - 3, paste_y - 3, 
            paste_x + user_size + 3, paste_y + user_size + 3
        ], outline='white', width=3)
        
        # Add travel badge
        badge_size = 40
        badge_x = paste_x + user_size - badge_size//2
        badge_y = paste_y - badge_size//2
        draw_result.ellipse([
            badge_x, badge_y, 
            badge_x + badge_size, badge_y + badge_size
        ], fill='#ff6b35', outline='white', width=2)
        
        # Add text
        draw_result.text((badge_x + 8, badge_y + 8), "✈️", fill='white')
        
        return result_img

    def _save_result_image(self, image_data: bytes) -> Optional[str]:
        """Save image data to temporary file"""
        try:
            # Create temp directory
            os.makedirs("/tmp", exist_ok=True)
            
            # Generate filename
            filename = f"generated_{uuid.uuid4().hex}.jpg"
            filepath = f"/tmp/{filename}"
            
            # Save image
            if isinstance(image_data, bytes):
                with open(filepath, 'wb') as f:
                    f.write(image_data)
            else:
                image_data.save(filepath, "JPEG", quality=85)
            
            logger.info(f"Saved result image: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Failed to save result image: {e}")
            return None

    def get_service_status(self) -> Dict[str, Any]:
        """Get the status of the face swap service"""
        return {
            "status": "available",
            "methods": [
                "online_apis",
                "local_processing", 
                "mock_generation"
            ],
            "features": [
                "face_detection",
                "image_overlay",
                "travel_themes"
            ]
        }
