def load_data(file_path):
    import pandas as pd
    return pd.read_csv(file_path)

def save_model(model, file_path):
    import joblib
    joblib.dump(model, file_path)