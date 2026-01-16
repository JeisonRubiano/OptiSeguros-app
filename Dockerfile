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
# If there are other files in root needed, copy them too. 
# Assuming main.py is in server/ or root? 
# Based on file structure: c:\...\server\main.py. 
# And the start command was `server\venv\Scripts\python -m uvicorn main:app --app-dir server`
# So prompt suggests main.py is INSIDE server folder.

# Let's adjust strictness. 
# If we copy `server/` to `/app/server`, then `main.py` is at `/app/server/main.py`.

# Expose port 8000
EXPOSE 8000

# Define environment variable
ENV MODULE_NAME="main"
ENV VARIABLE_NAME="app"
ENV PORT="8000"

# Run uvicorn when the container launches
# We run from /app, pointing to server.main:app
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
