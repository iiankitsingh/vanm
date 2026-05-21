import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from strawberry.fastapi import GraphQLRouter
from server.graphql_schema import schema

app = FastAPI(
    title="AeroParse API Server",
    description="A highly-optimized, production-ready NOTAM and airspace restriction parsing service.",
    version="1.0.0"
)

# Include Strawberry GraphQL Router with WebSockets support enabled
graphql_router = GraphQLRouter(schema, subscription_protocols=["graphql-ws"])
app.include_router(graphql_router, prefix="/graphql")

# Get absolute path to the static directory
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")

# Ensure static folder exists
os.makedirs(static_dir, exist_ok=True)

# Mount the static directory to serve the frontend playground at the root URL '/'
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
