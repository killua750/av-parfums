from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """Site-wide pagination: 12 per page, client may raise it up to 100
    (the admin tables ask for page_size=100 to filter/count client-side)."""

    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100
