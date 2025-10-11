import pandas as pd
import requests
from bs4 import BeautifulSoup
import time

# Read your CSV
df = pd.read_csv('cleaned_items.csv')

def get_image_url(product_name):
    """Search Google Images and get first result"""
    try:
        # Google Images search
        search_url = f"https://www.google.com/search?tbm=isch&q={product_name.replace(' ', '+')}"
        headers = {'User-Agent': 'Mozilla/5.0'}
        
        response = requests.get(search_url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find first image
        img_tags = soup.find_all('img')
        if len(img_tags) > 1:  # Skip Google logo
            return img_tags[1].get('src')
        return None
    except:
        return None

# Add image URLs
df['Image URL'] = df['Item name'].apply(lambda x: get_image_url(x))

# Save updated CSV
df.to_csv('items_with_images.csv', index=False)
print("✅ Images added to items_with_images.csv")