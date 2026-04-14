import csv
import json
import io

from django.http import FileResponse
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Dataset
from .serializers import DatasetSerializer, DatasetUploadSerializer

DEMO_DATASETS = {
    'titanic': {
        'name': 'Titanic',
        'description': 'Данные о пассажирах Титаника',
        'filename': 'titanic.csv',
    },
    'house_prices': {
        'name': 'House Prices',
        'description': 'Цены на жилье — набор для регрессии',
        'filename': 'house_prices.csv',
    },
}


class DatasetListCreateView(generics.ListCreateAPIView):
    """GET — список датасетов; POST — загрузить новый."""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DatasetUploadSerializer
        return DatasetSerializer

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        uploaded_file = serializer.validated_data['file']
        rows, cols = self._count_rows_cols(uploaded_file)
        serializer.save(user=self.request.user, rows=rows, columns=cols)

    @staticmethod
    def _count_rows_cols(uploaded_file):
        """Подсчёт строк и колонок загруженного файла."""
        try:
            ext = uploaded_file.name.rsplit('.', 1)[-1].lower()
            uploaded_file.seek(0)
            content = uploaded_file.read().decode('utf-8')
            uploaded_file.seek(0)

            if ext == 'csv':
                reader = csv.reader(io.StringIO(content))
                rows_list = list(reader)
                if not rows_list:
                    return 0, 0
                cols = len(rows_list[0])
                return len(rows_list) - 1, cols  # exclude header
            elif ext == 'json':
                data = json.loads(content)
                if isinstance(data, list) and data:
                    return len(data), len(data[0]) if isinstance(data[0], dict) else 0
                return 0, 0
        except Exception:
            return 0, 0


class DatasetDetailView(generics.RetrieveDestroyAPIView):
    """GET — метаданные + ссылка для скачивания; DELETE — удалить."""
    serializer_class = DatasetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)


class DatasetDownloadView(APIView):
    """GET /api/datasets/<id>/download/ — скачать файл."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            dataset = Dataset.objects.get(pk=pk, user=request.user)
        except Dataset.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return FileResponse(dataset.file.open('rb'), as_attachment=True, filename=dataset.name)


class DemoListView(APIView):
    """GET /api/datasets/demo/ — список встроенных демо-датасетов."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        result = []
        for slug, info in DEMO_DATASETS.items():
            result.append({'slug': slug, **info})
        return Response(result)


class DemoDetailView(APIView):
    """GET /api/datasets/demo/<slug>/ — содержимое демо-датасета (JSON)."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        if slug not in DEMO_DATASETS:
            return Response(
                {'detail': 'Датасет не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        import os
        from django.conf import settings as django_settings

        demo_dir = os.path.join(
            os.path.dirname(__file__), 'demo_data'
        )
        filepath = os.path.join(demo_dir, DEMO_DATASETS[slug]['filename'])

        if not os.path.exists(filepath):
            return Response(
                {'detail': 'Файл демо-датасета не найден на сервере.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            data = list(reader)

        return Response({
            'name': DEMO_DATASETS[slug]['name'],
            'data': data,
        })
