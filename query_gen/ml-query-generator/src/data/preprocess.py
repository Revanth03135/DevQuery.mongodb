def load_dataset(file_path):
    import pandas as pd
    return pd.read_csv(file_path)

def clean_text(text):
    import re
    text = re.sub(r'\s+', ' ', text)  # Remove extra whitespace
    text = re.sub(r'[^\w\s]', '', text)  # Remove punctuation
    return text.lower()  # Convert to lowercase

def split_data(data, test_size=0.2):
    from sklearn.model_selection import train_test_split
    return train_test_split(data, test_size=test_size, random_state=42)