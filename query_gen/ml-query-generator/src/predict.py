from src.models.query_generator import QueryGenerator

def main():
    API_KEY = "AIzaSyD1vaI6KO7WsCKVYVVOkZnfMSMC5AIyQ-Q"
    qg = QueryGenerator(API_KEY)
    user_prompt = input("Enter your query: ")
    result = qg.generate_query(user_prompt)
    print("\n--- Generated Queries ---")
    print(result)

if __name__ == "__main__":
    main()