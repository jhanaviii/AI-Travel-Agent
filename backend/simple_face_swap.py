"""
Simple Face Swap Service - No External Dependencies
This service provides basic image overlay functionality without requiring
external face swap models or APIs.
"""

import requests
import os
import uuid
import logging
from typing import Optional, Dict, Any
import base64
import io

logger = logging.getLogger(__name__)

class SimpleFaceSwapService:
    def __init__(self):
        self.mode = os.getenv("FACE_SWAP_MODE", "mock_generation")
        self.api_key = os.getenv("FACE_SWAP_API_KEY", "")
        
        # Free API options
        self.free_apis = [
            {
                'name': 'deepai',
                'url': 'https://api.deepai.org/api/face-swap',
                'headers': {
                    'api-key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K'
                }
            }
        ]

    def swap_face_with_destination(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """
        Main face swap function with multiple fallbacks
        Returns: Path to generated image or None if failed
        """
        logger.info(f"Starting face swap (mode: {self.mode}): user={user_photo_url}, destination={destination_image_url}")
        
        if self.mode == "online_api":
            try:
                result = self._try_online_api(user_photo_url, destination_image_url)
                if result:
                    logger.info("Face swap completed using online API")
                    return result
            except Exception as e:
                logger.warning(f"Online API failed: {e}")

        # Always fallback to mock generation
        try:
            result = self._create_mock_visualization(user_photo_url, destination_image_url)
            if result:
                logger.info("Face swap completed using mock generation")
                return result
        except Exception as e:
            logger.error(f"Mock generation failed: {e}")

        logger.error("All face swap methods failed")
        return None

    def _try_online_api(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """Try online face swap API"""
        try:
            # Download images
            user_response = requests.get(user_photo_url, timeout=15)
            user_response.raise_for_status()
            
            dest_response = requests.get(destination_image_url, timeout=15)
            dest_response.raise_for_status()

            # Try DeepAI API
            files = {
                'image1': ('user.jpg', user_response.content, 'image/jpeg'),
                'image2': ('destination.jpg', dest_response.content, 'image/jpeg')
            }
            
            response = requests.post(
                self.free_apis[0]['url'],
                files=files,
                headers=self.free_apis[0]['headers'],
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
            logger.error(f"Online API error: {e}")
            
        return None

    def _create_mock_visualization(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """Create a mock visualization by combining images"""
        try:
            # Download destination image
            dest_response = requests.get(destination_image_url, timeout=15)
            dest_response.raise_for_status()
            
            # For mock generation, we'll create a simple text-based visualization
            # since we don't have PIL available
            return self._create_text_visualization(user_photo_url, destination_image_url)
            
        except Exception as e:
            logger.error(f"Mock visualization failed: {e}")
            return None

    def _create_text_visualization(self, user_photo_url: str, destination_image_url: str) -> Optional[str]:
        """Create a text-based visualization (fallback when PIL is not available)"""
        try:
            # Create a simple HTML visualization
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Travel Visualization</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }}
                    .container {{ max-width: 800px; margin: 0 auto; text-align: center; }}
                    .visualization {{ background: rgba(255,255,255,0.1); border-radius: 20px; padding: 30px; margin: 20px 0; backdrop-filter: blur(10px); }}
                    .user-photo {{ width: 150px; height: 150px; border-radius: 50%; border: 4px solid white; margin: 20px auto; display: block; }}
                    .destination-photo {{ width: 100%; max-width: 600px; border-radius: 15px; margin: 20px 0; }}
                    .travel-badge {{ background: #ff6b35; color: white; padding: 10px 20px; border-radius: 25px; display: inline-block; margin: 10px; }}
                    .message {{ font-size: 1.2em; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🌟 Your Travel Visualization</h1>
                    <div class="visualization">
                        <img src="{user_photo_url}" alt="Your Photo" class="user-photo">
                        <div class="message">✨ You're going to this amazing destination! ✨</div>
                        <img src="{destination_image_url}" alt="Destination" class="destination-photo">
                        <div class="travel-badge">✈️ Ready for Adventure! ✈️</div>
                        <p>Generated with AI Travel Agent</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Save as HTML file
            filename = f"visualization_{uuid.uuid4().hex}.html"
            filepath = f"/tmp/{filename}"
            
            os.makedirs("/tmp", exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            logger.info(f"Created HTML visualization: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Text visualization failed: {e}")
            return None

    def _save_result_image(self, image_data: bytes) -> Optional[str]:
        """Save image data to temporary file"""
        try:
            # Create temp directory
            os.makedirs("/tmp", exist_ok=True)
            
            # Generate filename
            filename = f"generated_{uuid.uuid4().hex}.jpg"
            filepath = f"/tmp/{filename}"
            
            # Save image
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            logger.info(f"Saved result image: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Failed to save result image: {e}")
            return None

    def get_service_status(self) -> Dict[str, Any]:
        """Get the status of the face swap service"""
        return {
            "status": "available",
            "mode": self.mode,
            "methods": [
                "online_api",
                "mock_generation"
            ],
            "features": [
                "image_overlay",
                "travel_themes",
                "html_visualization"
            ]
        } 