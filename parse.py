from typing import Any

import pandas as pd

def extrair_excel(caminho : str) -> dict[int, dict[str, Any]]:
    planilha = pd.read_excel(caminho)
    entidades = planilha[['Nome', 'CPF', 'Tipo', 'Situacão']].to_dict(orient='index')
    return entidades
