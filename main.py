from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
import re
import torch
import torch.nn as nn

app = FastAPI()

vocab = [" ", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]

vocab_dictionary = {}
for i,c in enumerate(vocab):
    vocab_dictionary[c] = i

def normalize(string: str):
    new_string = ""
    for c in string:
        if c in vocab:
            new_string = new_string + c
        else:
            new_string = new_string + " "
    return re.sub(r'\s+', ' ', new_string)

embedding = nn.Embedding(27, 2)

@app.get("/vocab")
def get_vocab():
    return vocab_dictionary


@app.get('/encode')
def encode(string: str):
    encoded = []
    for c in normalize(string):
        encoded.append(vocab_dictionary[c])
        
    return encoded

@app.get('/embed')
def embed(char: str):
    index = vocab_dictionary[char]
    vector = embedding(torch.tensor(index))
    return vector.tolist()




app.mount("/", StaticFiles(directory="static", html=True), name="static")