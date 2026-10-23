from django.db import models


class Usuario(models.Model):
    nome = models.CharField(max_length=150)
    cpf = models.CharField(max_length=20)
    tipo = models.CharField(max_length=50)
    situacao = models.CharField(max_length=50)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return f"{self.nome} ({self.cpf})"

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "cpf": self.cpf,
            "tipo": self.tipo,
            "situacao": self.situacao,
            "criado_em": self.criado_em.strftime("%d/%m/%Y %H:%M") if self.criado_em else "",
        }
