import csv
import json
import io

from django.http import FileResponse
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Dataset
from .serializers import DatasetSerializer, DatasetUploadSerializer
from django.contrib.auth import get_user_model

class StatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        User = get_user_model()
        users_count = User.objects.count()
        datasets_count = Dataset.objects.count()
        charts_count = datasets_count * 5 + 12

        return Response({
            'users': users_count,
            'datasets': datasets_count,
            'charts': charts_count
        })

DEMO_DATASETS = {
    'titanic': {
        'name': 'Titanic',
        'description': 'Данные о пассажирах Титаника (выживаемость, классы, возраст)',
        'filename': 'titanic.csv',
    },
    'california_housing': {
        'name': 'California Housing',
        'description': 'Данные переписи Калифорнии (цены на жилье)',
        'filename': 'california_housing.csv',
    },
    'iris': {
        'name': 'Iris',
        'description': 'Классический датасет с параметрами цветков ириса',
        'filename': 'iris.csv',
    },
    'diamonds': {
        'name': 'Diamonds',
        'description': 'Цены и характеристики почти 54 000 бриллиантов',
        'filename': 'diamonds.csv',
    },
    'penguins': {
        'name': 'Palmer Penguins',
        'description': 'Данные о трех видах пингвинов (размеры крыльев, масса)',
        'filename': 'penguins.csv',
    },
    'tips': {
        'name': 'Restaurant Tips',
        'description': 'Данные о чаевых в ресторане',
        'filename': 'tips.csv',
    },
}

class DatasetListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DatasetUploadSerializer
        return DatasetSerializer

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        uploaded_file = serializer.validated_data['file']
        
        req_rows = self.request.data.get('rows')
        req_cols = self.request.data.get('columns')
        
        if req_rows is not None and req_cols is not None:
            try:
                rows = int(req_rows)
                cols = int(req_cols)
            except ValueError:
                rows, cols = self._count_rows_cols(uploaded_file)
        else:
            rows, cols = self._count_rows_cols(uploaded_file)
            
        serializer.save(user=self.request.user, rows=rows, columns=cols)

    @staticmethod
    def _count_rows_cols(uploaded_file):
        try:
            ext = uploaded_file.name.rsplit('.', 1)[-1].lower()
            uploaded_file.seek(0)

            if ext == 'parquet':
                return 0, 0

            content = uploaded_file.read().decode('utf-8')
            uploaded_file.seek(0)

            if ext == 'csv':
                content_stripped = content.strip()
                if content_stripped.startswith('[') or content_stripped.startswith('{'):
                    try:
                        data = json.loads(content)
                        rows = _extract_json_rows(data)
                        if rows:
                            return len(rows), len(rows[0]) if isinstance(rows[0], dict) else 0
                    except Exception:
                        pass
                try:
                    dialect = csv.Sniffer().sniff(content[:2048], delimiters=',;\t|')
                    reader = csv.reader(io.StringIO(content), dialect)
                except Exception:
                    reader = csv.reader(io.StringIO(content))

                rows_list = list(reader)
                if not rows_list:
                    return 0, 0
                cols = len(rows_list[0])
                return len(rows_list) - 1, cols
            elif ext == 'json':
                data = json.loads(content)
                rows = _extract_json_rows(data)
                if rows:
                    return len(rows), len(rows[0]) if isinstance(rows[0], dict) else 0
                return 0, 0
        except Exception:
            return 0, 0

class DatasetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DatasetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

class DatasetDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            dataset = Dataset.objects.get(pk=pk, user=request.user)
        except Dataset.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return FileResponse(dataset.file.open('rb'), as_attachment=True, filename=dataset.name)

class ClaimDatasetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        file = request.FILES.get('file')
        name = request.data.get('name', 'Без названия')
        if not file:
            return Response(
                {'detail': 'Файл обязателен.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ext = file.name.rsplit('.', 1)[-1].lower()
        if ext not in ('csv', 'json', 'parquet'):
            return Response(
                {'detail': 'Формат не поддерживается.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        req_rows = request.data.get('rows')
        req_cols = request.data.get('columns')
        
        if req_rows is not None and req_cols is not None:
            try:
                rows = int(req_rows)
                cols = int(req_cols)
            except ValueError:
                rows, cols = DatasetListCreateView._count_rows_cols(file)
        else:
            rows, cols = DatasetListCreateView._count_rows_cols(file)

        dataset = Dataset.objects.create(
            user=request.user,
            name=name,
            file=file,
            rows=rows,
            columns=cols,
        )
        return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)

class DemoListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        result = []
        for slug, info in DEMO_DATASETS.items():
            result.append({'slug': slug, **info})
        return Response(result)

class DemoDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        if slug not in DEMO_DATASETS:
            return Response(
                {'detail': 'Датасет не найден.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        import os

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

def _extract_json_rows(data):
    if isinstance(data, list) and len(data) > 0:
        if isinstance(data[0], dict):
            return data

    if isinstance(data, dict):
        if 'data' in data:
            inner = data['data']
            if isinstance(inner, list) and len(inner) > 0 and isinstance(inner[0], dict):
                return inner

        keys = list(data.keys())
        if keys and isinstance(data[keys[0]], list):
            length = len(data[keys[0]])
            rows = []
            for i in range(length):
                row = {}
                for k in keys:
                    row[k] = data[k][i] if i < len(data[k]) else None
                rows.append(row)
            return rows

    return []
