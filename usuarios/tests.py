import json
from django.test import TestCase, Client
from django.urls import reverse
from .models import Usuario


class UsuarioCrudTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.usuario1 = Usuario.objects.create(
            nome="Anderson Neo",
            cpf="111.222.333-44",
            tipo="Administrador",
            situacao="Ativo"
        )
        self.usuario2 = Usuario.objects.create(
            nome="Trinity Hacker",
            cpf="555.666.777-88",
            tipo="Operador",
            situacao="Inativo"
        )

    def test_index_view_loads(self):
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Sistema Integrado de Gestão de Usuários")
        self.assertContains(response, "retro.css")
        self.assertContains(response, "app.js")

    def test_listar_usuarios(self):
        response = self.client.get(reverse('api_usuarios_collection'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 2)
        self.assertEqual(len(data["usuarios"]), 2)

    def test_filtrar_usuarios(self):
        response = self.client.get(reverse('api_usuarios_collection') + '?q=Neo')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["usuarios"][0]["nome"], "Anderson Neo")

    def test_criar_usuario_sucesso(self):
        payload = {
            "nome": "Morpheus Captain",
            "cpf": "999.888.777-66",
            "tipo": "Gerente",
            "situacao": "Pendente"
        }
        response = self.client.post(
            reverse('api_usuarios_collection'),
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("usuario", data)
        self.assertEqual(data["usuario"]["nome"], "Morpheus Captain")
        self.assertTrue(Usuario.objects.filter(cpf="999.888.777-66").exists())

    def test_criar_usuario_campos_obrigatorios(self):
        payload = {
            "nome": "Incompleto",
            "cpf": "",
            "tipo": "",
            "situacao": ""
        }
        response = self.client.post(
            reverse('api_usuarios_collection'),
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)
        self.assertIn("cpf", data["fields"])

    def test_obter_detalhe_usuario(self):
        response = self.client.get(reverse('api_usuario_item', args=[self.usuario1.id]))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["usuario"]["id"], self.usuario1.id)
        self.assertEqual(data["usuario"]["nome"], "Anderson Neo")

    def test_atualizar_usuario(self):
        payload = {
            "nome": "Thomas A. Anderson (The One)",
            "cpf": "111.222.333-44",
            "tipo": "Super Administrador",
            "situacao": "Ativo"
        }
        response = self.client.put(
            reverse('api_usuario_item', args=[self.usuario1.id]),
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        self.usuario1.refresh_from_db()
        self.assertEqual(self.usuario1.nome, "Thomas A. Anderson (The One)")
        self.assertEqual(self.usuario1.tipo, "Super Administrador")

    def test_excluir_usuario(self):
        target_id = self.usuario2.id
        response = self.client.delete(reverse('api_usuario_item', args=[target_id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Usuario.objects.filter(id=target_id).exists())

    def test_popular_amostra(self):
        Usuario.objects.all().delete()
        response = self.client.post(reverse('api_usuarios_popular'))
        self.assertEqual(response.status_code, 200)
        self.assertGreater(Usuario.objects.count(), 0)
