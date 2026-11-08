import os
import uvicorn
uvicorn.run('app.main:app',host=os.getenv('STUDIO_HOST','127.0.0.1'),port=int(os.getenv('STUDIO_PORT','8765')))
