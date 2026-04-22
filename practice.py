import torch
import torch.nn as nn

embedder = nn.Embedding(10,2)

result = embedder(torch.tensor(7)).tolist()

print(result)