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
position_embedding = nn.Embedding(21,2)

vocab_lookup = {}
for i, c in enumerate(vocab):
    dictionary = {
        "char": c,
        "id": i,
        "embedding": embedding(torch.tensor(i)).tolist()
    }
    vocab_lookup[c] = dictionary

position_lookup = {}
for i in range(21):
    dictionary = {
        "position": i,
        "embedding": position_embedding(torch.tensor(i)).tolist()
    }
    position_lookup[i] = dictionary



@app.get('/vocab')
def get_vocab():
    return vocab_lookup

@app.get('/position')
def get_position():
    return position_lookup

@app.get('/embed_text')
def embed_text(text: str):
    result = []
    for i, c in enumerate(normalize(text)):
        char_vector = vocab_lookup[c]["embedding"]
        pos_vector = position_lookup[i]["embedding"]
        final_vector = (torch.tensor(char_vector) + torch.tensor(pos_vector)).tolist()
        dictionary = {
            "char": c,
            "character_embedding": char_vector,
            "position_embedding": pos_vector,
            "final_embedding": final_vector
        }
        result.append(dictionary)
    return result



app.mount("/", StaticFiles(directory="static", html=True), name="static")