from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import os
from pathlib import Path

class PolicyStateRequest(BaseModel):
    consecutivo: str
    estado: str  # "RECAUDADA", "ANULADA", etc.
    usuario: Optional[str] = "Sistema"

class PolicyStateManager:
    def __init__(self, file_path: str = "server/data/policy_states.json"):
        self.file_path = Path(file_path)
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize file if it doesn't exist
        if not self.file_path.exists():
            self._write_states({})
    
    def _read_states(self) -> dict:
        """Read states from JSON file"""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _write_states(self, states: dict):
        """Write states to JSON file"""
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(states, f, ensure_ascii=False, indent=2)
    
    def save_state(self, consecutivo: str, estado: str, usuario: str = "Sistema"):
        """Save or update a policy state"""
        states = self._read_states()
        states[consecutivo] = {
            "estado": estado,
            "fecha": datetime.now().isoformat(),
            "usuario": usuario
        }
        self._write_states(states)
        return states[consecutivo]
    
    def get_state(self, consecutivo: str) -> Optional[dict]:
        """Get state for a specific policy"""
        states = self._read_states()
        return states.get(consecutivo)
    
    def get_all_states(self) -> dict:
        """Get all policy states"""
        return self._read_states()
    
    def delete_state(self, consecutivo: str):
        """Delete a policy state"""
        states = self._read_states()
        if consecutivo in states:
            del states[consecutivo]
            self._write_states(states)
            return True
        return False

# Global instance
policy_state_manager = PolicyStateManager()
