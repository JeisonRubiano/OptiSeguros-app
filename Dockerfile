# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY server/requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the server directory contents into the container at /app/server
COPY server/ ./server

# Expose port (defaults to 8000)
EXPOSE 8000

# Set environment variables
ENV MODULE_NAME="server.main"
ENV VARIABLE_NAME="app"
ENV PORT="8000"

# Use shell form to allow variable expansion for $PORT
CMD uvicorn server.main:app --host 0.0.0.0 --port ${PORT}
