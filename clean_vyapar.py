import pandas as pd
import re

# Load the Excel file
file_path = "Export Items.xlsx"  # Replace with your file path
df = pd.read_excel(file_path)

# Clean data
def clean_name(name):
    if pd.isna(name): return "Unnamed"
    name = str(name).strip()
    # Remove leading code (e.g., "0445 ")
    name = re.sub(r'^\d+\s+', '', name)
    # Remove "Rs" and price at end (e.g., "Rs 300")
    name = re.sub(r'\sRs\s*\d+(?:\.?\d+)?', '', name)
    # Remove "Bottle" or "Bottles"
    name = re.sub(r'\bBottle\b|\bBottles\b', '', name).strip()
    return name

# Apply cleaning
df['Item name'] = df['Item name*'].apply(clean_name)
df['Category'] = df['Category'].fillna('Other')
df['Size/Quantity'] = df['Base Unit (x)'].fillna('N/A')
df['Price'] = df['Sale price'].fillna(0.0).astype(float)

# Select relevant columns
df = df[['Item name', 'Category', 'Size/Quantity', 'Price']]

# Drop rows with no item name
df = df[df['Item name'] != 'Unnamed']

# Save to CSV
df.to_csv('cleaned_items.csv', index=False)
print("Cleaned data saved to 'cleaned_items.csv'")