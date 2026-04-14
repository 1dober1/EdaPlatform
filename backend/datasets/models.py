from django.db import models
from django.conf import settings


def user_dataset_path(instance, filename):
    return f'datasets/user_{instance.user.id}/{filename}'


class Dataset(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='datasets',
    )
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=user_dataset_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    rows = models.PositiveIntegerField(default=0)
    columns = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.name} ({self.user.username})'
