from django.contrib import admin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nome', 'cpf', 'tipo', 'situacao', 'criado_em')
    search_fields = ('nome', 'cpf', 'tipo', 'situacao')
    list_filter = ('tipo', 'situacao')
