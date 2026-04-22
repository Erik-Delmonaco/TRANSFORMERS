from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
import re
import torch
import torch.nn as nn

app = FastAPI()

vocab = [" ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]

def normalize(string: str):
    string = string.lower()
    new_string = ""
    for c in string:
        if c in vocab:
            new_string = new_string + c
        else:
            new_string = new_string + " "
    return re.sub(r'\s+', ' ', new_string)

embedding = nn.Embedding(27,2)

vocab_lookup = {}
for i, c in enumerate(vocab):
    dictionary = {
        "id": i,
        "embedding": embedding(torch.tensor(i)).tolist()
    }
    vocab_lookup[c] = dictionary

@app.get('/vocab')
def get_vocab():
    return vocab_lookup



app.mount("/", StaticFiles(directory="static", html=True), name="static")