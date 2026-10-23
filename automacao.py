from time import sleep

from selenium import webdriver
import time
from parse import extrair_excel

navegador = webdriver.Chrome()

planilha = extrair_excel('pessoas.xlsx')
navegador.get('http://127.0.0.1:8000/')
navegador.maximize_window()

for linha, dados in planilha.items():
    nome = navegador.find_element('id', 'cad-nome')
    cpf = navegador.find_element('id', 'cad-cpf')
    tipo = navegador.find_element('id', 'cad-tipo')
    situacao = navegador.find_element('id', 'cad-situacao')
    adicionar = navegador.find_element('id', 'btn-gravar')

    nome.clear()
    nome.send_keys(str(dados['Nome']))

    cpf.clear()
    cpf.send_keys(str(dados['CPF']))

    tipo.clear()
    tipo.send_keys(str(dados['Tipo']))

    situacao.clear()
    situacao.send_keys(str(dados['Situacão']))

    adicionar.click()

time.sleep(10)