from rest_framework import serializers
from .models import ConfiguracionFiscalSede


class ConfiguracionFiscalSedeSerializer(serializers.ModelSerializer):
    sede_name = serializers.CharField(source='sede.name', read_only=True)

    class Meta:
        model  = ConfiguracionFiscalSede
        fields = (
            'id', 'sede', 'sede_name',
            'nombre_comercial', 'nombre_legal', 'rfc',
            'direccion', 'telefono', 'email',
            'logo_url', 'leyenda_ticket',
            'updated_at',
        )
        read_only_fields = ('id', 'sede_name', 'updated_at')
