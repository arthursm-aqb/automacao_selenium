import json
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.db.models import Q
from .models import Usuario


@ensure_csrf_cookie
def index_view(request):
    """Renderiza a página principal (SPA)."""
    return render(request, "usuarios/index.html")


@require_http_methods(["GET", "POST"])
def usuarios_collection_view(request):
    """
    GET: Lista usuários (com suporte a busca por ?q=)
    POST: Cria novo usuário
    """
    if request.method == "GET":
        query = request.GET.get("q", "").strip()
        usuarios = Usuario.objects.all()
        if query:
            usuarios = usuarios.filter(
                Q(nome__icontains=query) |
                Q(cpf__icontains=query) |
                Q(tipo__icontains=query) |
                Q(situacao__icontains=query)
            ).distinct()
        data = [u.to_dict() for u in usuarios]
        return JsonResponse({"usuarios": data, "total": len(data)})

    elif request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Formato JSON inválido."}, status=400)

        nome = str(payload.get("nome", "")).strip()
        cpf = str(payload.get("cpf", "")).strip()
        tipo = str(payload.get("tipo", "")).strip()
        situacao = str(payload.get("situacao", "")).strip()

        errors = {}
        if not nome:
            errors["nome"] = "O campo Nome é obrigatório."
        if not cpf:
            errors["cpf"] = "O campo CPF é obrigatório."
        if not tipo:
            errors["tipo"] = "O campo Tipo é obrigatório."
        if not situacao:
            errors["situacao"] = "O campo Situação é obrigatório."

        if errors:
            return JsonResponse({"error": "Dados inválidos.", "fields": errors}, status=400)

        usuario = Usuario.objects.create(
            nome=nome,
            cpf=cpf,
            tipo=tipo,
            situacao=situacao,
        )
        return JsonResponse({
            "message": "Usuário cadastrado com sucesso!",
            "usuario": usuario.to_dict()
        }, status=201)


@require_http_methods(["GET", "PUT", "DELETE"])
def usuario_item_view(request, pk):
    """
    GET: Retorna detalhes de um usuário
    PUT: Atualiza usuário
    DELETE: Remove usuário
    """
    usuario = get_object_or_404(Usuario, pk=pk)

    if request.method == "GET":
        return JsonResponse({"usuario": usuario.to_dict()})

    elif request.method == "PUT":
        try:
            payload = json.loads(request.body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"error": "Formato JSON inválido."}, status=400)

        nome = str(payload.get("nome", "")).strip()
        cpf = str(payload.get("cpf", "")).strip()
        tipo = str(payload.get("tipo", "")).strip()
        situacao = str(payload.get("situacao", "")).strip()

        errors = {}
        if not nome:
            errors["nome"] = "O campo Nome é obrigatório."
        if not cpf:
            errors["cpf"] = "O campo CPF é obrigatório."
        if not tipo:
            errors["tipo"] = "O campo Tipo é obrigatório."
        if not situacao:
            errors["situacao"] = "O campo Situação é obrigatório."

        if errors:
            return JsonResponse({"error": "Dados inválidos.", "fields": errors}, status=400)

        usuario.nome = nome
        usuario.cpf = cpf
        usuario.tipo = tipo
        usuario.situacao = situacao
        usuario.save()

        return JsonResponse({
            "message": "Usuário atualizado com sucesso!",
            "usuario": usuario.to_dict()
        })

    elif request.method == "DELETE":
        usuario_id = usuario.id
        nome_deletado = usuario.nome
        usuario.delete()
        return JsonResponse({
            "message": f"Usuário '{nome_deletado}' (ID {usuario_id}) removido com sucesso!",
            "deleted_id": usuario_id
        })


@require_http_methods(["POST"])
def popular_amostra_view(request):
    """Popula com dados de exemplo clássicos dos anos 2000 caso queira testar rapidamente."""
    exemplos = [
        {"nome": "Neo / Thomas Anderson", "cpf": "111.222.333-00", "tipo": "Administrador", "situacao": "Ativo"},
        {"nome": "Trinity Hacker", "cpf": "444.555.666-11", "tipo": "Operador", "situacao": "Ativo"},
        {"nome": "Morpheus Nebuchadnezzar", "cpf": "777.888.999-22", "tipo": "Gerente", "situacao": "Pendente"},
        {"nome": "Agente Smith", "cpf": "000.000.000-99", "tipo": "Auditor", "situacao": "Bloqueado"},
        {"nome": "ICQ UIN #12938475", "cpf": "321.654.987-55", "tipo": "Convidado", "situacao": "Inativo"},
    ]
    criados = 0
    for ex in exemplos:
        _, created = Usuario.objects.get_or_create(cpf=ex["cpf"], defaults=ex)
        if created:
            criados += 1
    return JsonResponse({
        "message": f"Base populada! {criados} novos registros inseridos.",
        "criados": criados
    })
