from django.urls import path
from .views import (
    DatasetListCreateView,
    DatasetDetailView,
    DatasetDownloadView,
    DemoListView,
    DemoDetailView,
)

urlpatterns = [
    path('', DatasetListCreateView.as_view(), name='dataset-list-create'),
    path('<int:pk>/', DatasetDetailView.as_view(), name='dataset-detail'),
    path('<int:pk>/download/', DatasetDownloadView.as_view(), name='dataset-download'),
    path('demo/', DemoListView.as_view(), name='demo-list'),
    path('demo/<slug:slug>/', DemoDetailView.as_view(), name='demo-detail'),
]
