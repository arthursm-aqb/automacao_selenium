from django.urls import path
from . import views

urlpatterns = [
    path('', views.index_view, name='index'),
    path('api/usuarios/', views.usuarios_collection_view, name='api_usuarios_collection'),
    path('api/usuarios/<int:pk>/', views.usuario_item_view, name='api_usuario_item'),
    path('api/usuarios/popular/', views.popular_amostra_view, name='api_usuarios_popular'),
]
