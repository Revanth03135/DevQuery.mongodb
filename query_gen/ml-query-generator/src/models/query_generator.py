import google.generativeai as genai

class QueryGenerator:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        # Use the best available model: Gemini 2.5 Pro (stable, latest, high capability)
        self.model = genai.GenerativeModel('models/gemini-2.5-pro')

    def generate_query(self, prompt):
        full_prompt = (
            "Convert the following natural language request into both SQL and MongoDB queries.\n"
            f"Request: {prompt}\n"
            "Return format:\nSQL Query:\nMongoDB Query:"
        )
        response = self.model.generate_content(full_prompt)
        return response.text.strip()

if __name__ == "__main__":
    API_KEY = "AIzaSyD1vaI6KO7WsCKVYVVOkZnfMSMC5AIyQ-Q"
    qg = QueryGenerator(API_KEY)
    user_prompt = input("Enter your query: ")
    result = qg.generate_query(user_prompt)
    print("\n--- Generated Queries ---")
    print(result)