from django.test import TestCase
from rest_framework.test import APIClient
from .models import Task


class TaskAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.task = Task.objects.create(title='Test Task', priority='high')

    def test_list_tasks(self):
        res = self.client.get('/api/tasks/')
        self.assertEqual(res.status_code, 200)

    def test_create_task(self):
        res = self.client.post('/api/tasks/', {'title': 'New Task'}, format='json')
        self.assertEqual(res.status_code, 201)

    def test_get_task(self):
        res = self.client.get(f'/api/tasks/{self.task.id}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['title'], 'Test Task')

    def test_update_task(self):
        res = self.client.put(f'/api/tasks/{self.task.id}/', {'title': 'Updated', 'priority': 'low'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_delete_task(self):
        res = self.client.delete(f'/api/tasks/{self.task.id}/')
        self.assertEqual(res.status_code, 204)
