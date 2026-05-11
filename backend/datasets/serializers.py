from rest_framework import serializers
from .models import Dataset

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('id', 'name', 'file', 'uploaded_at', 'rows', 'columns')
        read_only_fields = ('id', 'uploaded_at', 'rows', 'columns')

class DatasetUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('id', 'name', 'file')
        read_only_fields = ('id',)

    def validate_file(self, value):
        ext = value.name.rsplit('.', 1)[-1].lower()
        if ext not in ('csv', 'json', 'parquet'):
            raise serializers.ValidationError(
                'Поддерживаются только файлы CSV, JSON и Parquet.'
            )
        return value
