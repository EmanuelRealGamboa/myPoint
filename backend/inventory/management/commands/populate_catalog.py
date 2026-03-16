"""
Management command: populate_catalog
=====================================
Populates the database with:
  - Categories (12) + Subcategories (~60)
  - Motorcycle brands (8) + Models (~25)
  - Manufacturer brands (10)
  - Sample products (20) with stock, prices, and fitment

Usage:
  python manage.py populate_catalog
  python manage.py populate_catalog --reset   (deletes existing catalog data first)
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Populate database with motorcycle parts catalog data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset', action='store_true',
            help='Delete all existing catalog data before populating',
        )

    def handle(self, *args, **options):
        from inventory.models import (
            Categoria, Subcategoria, MarcaFabricante,
            MarcaMoto, ModeloMoto, Producto,
        )

        if options['reset']:
            self.stdout.write('🗑️  Eliminando datos del catálogo...')
            Producto.objects.all().delete()
            Subcategoria.objects.all().delete()
            Categoria.objects.all().delete()
            MarcaFabricante.objects.all().delete()
            ModeloMoto.objects.all().delete()
            MarcaMoto.objects.all().delete()
            self.stdout.write(self.style.WARNING('  Datos eliminados.'))

        with transaction.atomic():
            self._create_categories()
            self._create_fabricante_brands()
            self._create_moto_catalog()
            self._create_products()

        self.stdout.write(self.style.SUCCESS('\n✅ Catálogo poblado exitosamente.'))

    # ──────────────────────────────────────────────────────────────────────────
    #  CATEGORIES & SUBCATEGORIES
    # ──────────────────────────────────────────────────────────────────────────

    def _create_categories(self):
        from inventory.models import Categoria, Subcategoria
        self.stdout.write('\n📂 Creando categorías y subcategorías...')

        catalog = {
            'Motor': [
                'Pistón y Segmentos', 'Cilindro y Cabeza', 'Válvulas y Muelles',
                'Cigüeñal y Biela', 'Árbol de Levas', 'Empaques y Retenes',
                'Filtro de Aceite', 'Tapón de Aceite', 'Kit de Motor Completo',
            ],
            'Transmisión': [
                'Cadena de Transmisión', 'Piñón Delantero', 'Corona Trasera',
                'Kit Cadena + Piñones', 'Clutch (Discos, Plato, Resortes)',
                'Cable de Clutch', 'CVT / Correa (automáticas)',
            ],
            'Frenos': [
                'Balatas / Pastillas Delanteras', 'Balatas / Pastillas Traseras',
                'Disco de Freno Delantero', 'Disco de Freno Trasero',
                'Zapatas de Tambor', 'Cilindro Maestro',
                'Manguera de Freno', 'Líquido de Frenos',
            ],
            'Suspensión': [
                'Horquilla Delantera (par)', 'Amortiguador Trasero (par)',
                'Resorte de Horquilla', 'Aceite de Horquilla',
                'Buje / Bocín', 'Brazo Oscilante',
            ],
            'Sistema Eléctrico': [
                'Batería', 'Bujía', 'Bobina de Encendido',
                'CDI / Módulo de Encendido', 'Regulador / Rectificador',
                'Faros y Ópticas', 'Interruptores / Switchera',
                'Arnés de Cableado', 'Relay y Fusibles', 'Sensores',
            ],
            'Sistema de Combustible': [
                'Carburador Completo', 'Kit de Reparación Carburador',
                'Filtro de Gasolina', 'Llave de Paso',
                'Bomba de Gasolina', 'Depósito / Tanque',
            ],
            'Carrocería y Plásticos': [
                'Carenado Frontal', 'Carenado Lateral', 'Cubrecadena',
                'Guardafango Delantero', 'Guardafango Trasero',
                'Asiento / Cojín', 'Portabultos / Parrilla', 'Espejo Retrovisor',
            ],
            'Ruedas y Llantas': [
                'Rin Delantero', 'Rin Trasero',
                'Llanta Delantera', 'Llanta Trasera',
                'Cámara Delantera', 'Cámara Trasera', 'Rayos y Niples',
            ],
            'Escape': [
                'Tubo de Escape', 'Silenciador / Muffler', 'Empaque de Escape',
            ],
            'Lubricantes y Fluidos': [
                'Aceite Motor 4T', 'Aceite Motor 2T',
                'Filtro de Aceite', 'Filtro de Aire', 'Refrigerante / Anticongelante',
            ],
            'Accesorios y Ergonomía': [
                'Manubrio / Manillar', 'Puños / Grips', 'Pedal de Freno',
                'Pedal de Cambio', 'Palancas',
            ],
            'Kits y Mantenimiento': [
                'Kit de Carburación', 'Kit de Empaques', 'Kit de Filtros',
                'Kit de Frenos', 'Kit de Cadena', 'Kit de Servicio',
            ],
        }

        for cat_name, sub_names in catalog.items():
            cat, created = Categoria.objects.get_or_create(
                name=cat_name,
                defaults={'description': f'Categoría: {cat_name}'},
            )
            action = '✓ Creada' if created else '→ Ya existe'
            self.stdout.write(f'  {action}: {cat_name}')

            for sub_name in sub_names:
                Subcategoria.objects.get_or_create(
                    categoria=cat, name=sub_name,
                    defaults={'description': f'{cat_name} › {sub_name}'},
                )

        self.stdout.write(self.style.SUCCESS(f'  {Categoria.objects.count()} categorías, {Subcategoria.objects.count()} subcategorías'))

    # ──────────────────────────────────────────────────────────────────────────
    #  MANUFACTURER BRANDS
    # ──────────────────────────────────────────────────────────────────────────

    def _create_fabricante_brands(self):
        from inventory.models import MarcaFabricante
        self.stdout.write('\n🏭 Creando marcas fabricantes...')

        brands = [
            # (name, tipo, pais)
            ('NGK',         'AFTERMARKET', 'Japón'),
            ('AHL',         'AFTERMARKET', 'China'),
            ('BREMBO',      'AFTERMARKET', 'Italia'),
            ('EBC',         'AFTERMARKET', 'Reino Unido'),
            ('Motul',       'AFTERMARKET', 'Francia'),
            ('Bardahl',     'AFTERMARKET', 'México'),
            ('Mobil',       'AFTERMARKET', 'EUA'),
            ('OEM Honda',   'OEM',         'Japón'),
            ('OEM Yamaha',  'OEM',         'Japón'),
            ('OEM Italika', 'OEM',         'México'),
            ('Genérico',    'GENERICO',    ''),
        ]

        for name, tipo, pais in brands:
            MarcaFabricante.objects.get_or_create(
                name=name,
                defaults={'tipo': tipo, 'pais': pais},
            )
            self.stdout.write(f'  ✓ {name}')

    # ──────────────────────────────────────────────────────────────────────────
    #  MOTORCYCLE CATALOG
    # ──────────────────────────────────────────────────────────────────────────

    def _create_moto_catalog(self):
        from inventory.models import MarcaMoto, ModeloMoto
        self.stdout.write('\n🏍️  Creando catálogo de motos...')

        catalog = {
            'Italika': [
                # (modelo, año_desde, año_hasta, cc, tipo_motor, tipo_moto)
                ('FT125',  2015, None, 125, '4T', 'CARGO'),
                ('FT150',  2018, None, 150, '4T', 'CARGO'),
                ('DT125',  2015, None, 125, '4T', 'CARGO'),
                ('WS150',  2018, None, 150, '4T', 'NAKED'),
                ('TC200',  2020, None, 200, '4T', 'NAKED'),
                ('X150',   2018, None, 150, '4T', 'DEPORTIVA'),
                ('AT110',  2016, None, 110, '4T', 'SCOOTER'),
            ],
            'Honda': [
                ('CB125F',  2019, None, 125, '4T', 'NAKED'),
                ('CB190R',  2018, None, 190, '4T', 'NAKED'),
                ('XR125L',  2016, None, 125, '4T', 'OFF_ROAD'),
                ('Wave 110',2017, None, 110, '4T', 'CARGO'),
                ('PCX150',  2018, None, 150, '4T', 'SCOOTER'),
            ],
            'Yamaha': [
                ('YBR125',  2015, None, 125, '4T', 'NAKED'),
                ('FZ15',    2018, None, 150, '4T', 'NAKED'),
                ('XT125X',  2016, None, 125, '4T', 'OFF_ROAD'),
                ('FZ25',    2019, None, 250, '4T', 'NAKED'),
            ],
            'Suzuki': [
                ('GN125',   2015, None, 125, '4T', 'NAKED'),
                ('GS150',   2018, None, 150, '4T', 'NAKED'),
            ],
            'Carabela': [
                ('TT125',   2016, None, 125, '4T', 'CARGO'),
                ('Runner200', 2019, None, 200, '4T', 'NAKED'),
            ],
            'Vento': [
                ('Crossmax125', 2017, None, 125, '4T', 'NAKED'),
            ],
            'Benelli': [
                ('TNT15N', 2019, None, 150, '4T', 'NAKED'),
                ('TRK251', 2020, None, 250, '4T', 'NAKED'),
            ],
            'Bajaj': [
                ('Pulsar NS125', 2019, None, 125, '4T', 'DEPORTIVA'),
                ('Pulsar NS200', 2018, None, 200, '4T', 'DEPORTIVA'),
                ('CT100',        2016, None, 100, '4T', 'CARGO'),
            ],
        }

        for marca_name, models in catalog.items():
            marca, _ = MarcaMoto.objects.get_or_create(name=marca_name)
            self.stdout.write(f'  🏷️  {marca_name}:')
            for modelo_name, año_desde, año_hasta, cc, tipo_motor, tipo_moto in models:
                obj, created = ModeloMoto.objects.get_or_create(
                    marca=marca, modelo=modelo_name, año_desde=año_desde,
                    defaults={
                        'año_hasta': año_hasta, 'cilindraje': cc,
                        'tipo_motor': tipo_motor, 'tipo_moto': tipo_moto,
                    },
                )
                self.stdout.write(f'    {"✓" if created else "→"} {obj}')

    # ──────────────────────────────────────────────────────────────────────────
    #  SAMPLE PRODUCTS
    # ──────────────────────────────────────────────────────────────────────────

    def _create_products(self):
        from inventory.models import (
            Categoria, Subcategoria, MarcaFabricante,
            ModeloMoto, Producto, CompatibilidadPieza,
        )
        self.stdout.write('\n📦 Creando productos de muestra...')

        def cat(n): return Categoria.objects.get(name=n)
        def sub(cn, sn): return Subcategoria.objects.get(categoria__name=cn, name=sn)
        def fab(n): return MarcaFabricante.objects.filter(name=n).first()
        def moto(marca, modelo): return ModeloMoto.objects.filter(marca__name=marca, modelo=modelo).first()

        products_data = [
            # (sku, name, desc, categoria_name, subcat_name, marca_fab, tipo_parte, unidad,
            #  precio_venta, costo, precio_mayoreo, cod_barras, num_oem, ubicacion,
            #  es_universal, motos_compat)
            (
                'PAST-DEL-AHL-001',
                'Pastilla de Freno Delantera AHL',
                'Par de pastillas semimetálicas para freno de disco hidráulico. Alta resistencia al calor.',
                'Frenos', 'Balatas / Pastillas Delanteras',
                'AHL', 'AFTERMARKET', 'PAR',
                120.00, 48.00, 95.00,
                '7501234567891', '45105-GBY-901', 'A-01-2-A',
                False, [('Italika', 'FT125'), ('Italika', 'WS150'), ('Honda', 'CB125F')],
            ),
            (
                'PAST-TRA-AHL-001',
                'Pastilla de Freno Trasera AHL',
                'Par de pastillas para freno de disco trasero. Compatible con modelos de 125cc a 150cc.',
                'Frenos', 'Balatas / Pastillas Traseras',
                'AHL', 'AFTERMARKET', 'PAR',
                110.00, 44.00, 88.00,
                '7501234567892', '43105-GBY-901', 'A-01-2-B',
                False, [('Italika', 'FT125'), ('Italika', 'WS150')],
            ),
            (
                'BUJIA-NGK-CR7HSA',
                'Bujía NGK CR7HSA',
                'Bujía original NGK para motores 4T de 110cc a 150cc. Electrodo de níquel.',
                'Sistema Eléctrico', 'Bujía',
                'NGK', 'AFTERMARKET', 'PIEZA',
                85.00, 32.00, 68.00,
                '7501234567893', 'CR7HSA', 'B-02-1-A',
                True, [],  # Universal para 4T 110-150cc
            ),
            (
                'FILT-ACE-ITALIKA-FT125',
                'Filtro de Aceite Italika FT125/DT125',
                'Filtro de aceite OEM para motores Italika de 125cc. Reemplazos cada 2,000 km.',
                'Motor', 'Filtro de Aceite',
                'OEM Italika', 'OEM', 'PIEZA',
                65.00, 28.00, 52.00,
                '7501234567894', 'ITA-FT125-OIL-FILTER', 'A-02-1-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'CADENA-428H-120E',
                'Cadena de Transmisión 428H 120 Eslabones',
                'Cadena reforzada 428H para motos de trabajo y cargo. Incluye remache.',
                'Transmisión', 'Cadena de Transmisión',
                'AHL', 'AFTERMARKET', 'PIEZA',
                180.00, 72.00, 144.00,
                '7501234567895', '40530-GGY-901', 'A-03-1-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125'), ('Honda', 'Wave 110')],
            ),
            (
                'KIT-CADEN-ITALIKA-FT125',
                'Kit Cadena + Piñones Italika FT125',
                'Kit completo: cadena 428H 120E + piñón delantero 15T + corona trasera 39T.',
                'Transmisión', 'Kit Cadena + Piñones',
                'AHL', 'AFTERMARKET', 'KIT',
                380.00, 152.00, 304.00,
                '7501234567896', '', 'A-03-1-B',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'ACEITE-MOTUL-4T-10W40-1L',
                'Aceite Motor Motul 4T 10W-40 1 Litro',
                'Aceite semisintético para motores 4T. Viscosidad 10W-40. Protección máxima.',
                'Lubricantes y Fluidos', 'Aceite Motor 4T',
                'Motul', 'AFTERMARKET', 'LITRO',
                145.00, 58.00, 116.00,
                '3374650229117', '', 'C-01-1-A',
                True, [],
            ),
            (
                'ACEITE-BARDAHL-4T-20W50-1L',
                'Aceite Motor Bardahl 4T 20W-50 1 Litro',
                'Aceite mineral para motores 4T. Ideal para clima cálido. Protección antidesgaste.',
                'Lubricantes y Fluidos', 'Aceite Motor 4T',
                'Bardahl', 'AFTERMARKET', 'LITRO',
                95.00, 38.00, 76.00,
                '7501017600011', '', 'C-01-1-B',
                True, [],
            ),
            (
                'AMORT-TRA-ITALIKA-FT125',
                'Amortiguador Trasero Italika FT125 (par)',
                'Par de amortiguadores traseros. Longitud 330mm. Compatible FT125 y DT125 2015+.',
                'Suspensión', 'Amortiguador Trasero (par)',
                'AHL', 'AFTERMARKET', 'PAR',
                320.00, 128.00, 256.00,
                '7501234567898', '52400-GGY-901', 'A-04-2-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'DISCO-DEL-ITALIKA-WS150',
                'Disco de Freno Delantero Italika WS150',
                'Disco ventilado de 220mm. Acero inoxidable. Para modelos WS150 y TC200.',
                'Frenos', 'Disco de Freno Delantero',
                'AHL', 'AFTERMARKET', 'PIEZA',
                250.00, 100.00, 200.00,
                '7501234567899', '45251-GBY-901', 'A-01-3-A',
                False, [('Italika', 'WS150'), ('Italika', 'TC200')],
            ),
            (
                'CARB-KEIHIN-PB16',
                'Carburador PB16 tipo Keihin',
                'Carburador de 16mm compatible con la mayoría de scooters y motos 50-110cc automáticas.',
                'Sistema de Combustible', 'Carburador Completo',
                'Genérico', 'AFTERMARKET', 'PIEZA',
                350.00, 140.00, 280.00,
                '7501234567900', '', 'B-03-1-A',
                False, [('Italika', 'AT110')],
            ),
            (
                'CABLE-CLUTCH-ITALIKA',
                'Cable de Clutch Universal Italika',
                'Cable de embrague para modelos FT125, DT125 y WT150. Longitud 120cm.',
                'Transmisión', 'Cable de Clutch',
                'Genérico', 'AFTERMARKET', 'PIEZA',
                85.00, 34.00, 68.00,
                '7501234567901', '', 'A-03-2-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125'), ('Italika', 'WS150')],
            ),
            (
                'BATERIA-YTX5L-BS',
                'Batería YTX5L-BS 12V 5Ah',
                'Batería sellada libre de mantenimiento. 12V 5Ah. Para motos de 110-150cc.',
                'Sistema Eléctrico', 'Batería',
                'Genérico', 'AFTERMARKET', 'PIEZA',
                380.00, 152.00, 304.00,
                '7501234567902', 'YTX5L-BS', 'B-01-1-A',
                False, [('Italika', 'FT125'), ('Italika', 'WS150'), ('Honda', 'CB125F'), ('Yamaha', 'YBR125')],
            ),
            (
                'FILT-AIRE-ITALIKA-FT125',
                'Filtro de Aire Italika FT125',
                'Filtro de espuma para caja de filtro original. Evita la entrada de polvo al carburador.',
                'Motor', 'Filtro de Aceite',
                'OEM Italika', 'OEM', 'PIEZA',
                55.00, 22.00, 44.00,
                '7501234567903', 'ITA-FT125-AIR-FILTER', 'A-02-1-B',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'EMPAQUE-MOTOR-ITALIKA-FT125',
                'Kit Empaques Motor Italika FT125',
                'Juego completo de empaques: cabeza, cilindro, carter y tapa. Para overhaul de motor.',
                'Motor', 'Empaques y Retenes',
                'Genérico', 'AFTERMARKET', 'KIT',
                220.00, 88.00, 176.00,
                '7501234567904', '', 'A-02-2-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'PISTON-STD-ITALIKA-FT125',
                'Pistón con Segmentos STD Italika FT125',
                'Pistón diámetro 52.4mm STD con anillos de compresión y aceite. Material: aluminio forjado.',
                'Motor', 'Pistón y Segmentos',
                'Genérico', 'AFTERMARKET', 'KIT',
                450.00, 180.00, 360.00,
                '7501234567905', '13101-GGY-901', 'A-02-3-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'LLANTA-DEL-275-17',
                'Llanta Delantera 2.75-17 Tubo',
                'Llanta con tubo para rin de 17". Diseño multiuso. Compatible con la mayoría de cargo 125-150cc.',
                'Ruedas y Llantas', 'Llanta Delantera',
                'Genérico', 'AFTERMARKET', 'PIEZA',
                280.00, 112.00, 224.00,
                '7501234567906', '', 'D-01-1-A',
                True, [],
            ),
            (
                'LLANTA-TRA-300-17',
                'Llanta Trasera 3.00-17 Tubo',
                'Llanta con tubo para rin trasero de 17". Para motos de carga y trabajo.',
                'Ruedas y Llantas', 'Llanta Trasera',
                'Genérico', 'AFTERMARKET', 'PIEZA',
                320.00, 128.00, 256.00,
                '7501234567907', '', 'D-01-1-B',
                True, [],
            ),
            (
                'CDI-ITALIKA-FT125',
                'CDI / Módulo de Encendido Italika FT125',
                'Unidad CDI de repuesto para Italika FT125 y DT125. Equivalente al original.',
                'Sistema Eléctrico', 'CDI / Módulo de Encendido',
                'Genérico', 'AFTERMARKET', 'PIEZA',
                180.00, 72.00, 144.00,
                '7501234567908', '30400-GGY-901', 'B-01-2-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
            (
                'KIT-FRENOS-ITALIKA-FT125',
                'Kit de Frenos Completo Italika FT125',
                'Kit: pastillas delanteras + pastillas traseras + líquido DOT3. Para mantenimiento preventivo.',
                'Kits y Mantenimiento', 'Kit de Frenos',
                'AHL', 'AFTERMARKET', 'KIT',
                280.00, 112.00, 224.00,
                '7501234567909', '', 'A-01-4-A',
                False, [('Italika', 'FT125'), ('Italika', 'DT125')],
            ),
        ]

        created_count = 0
        for row in products_data:
            (sku, name, desc, cat_name, sub_name, fab_name, tipo_parte,
             unidad, precio, costo, mayoreo, cod_barras, num_oem, ubicacion,
             es_universal, motos) = row

            categoria    = Categoria.objects.filter(name=cat_name).first()
            subcategoria = Subcategoria.objects.filter(categoria__name=cat_name, name=sub_name).first()
            marca_fab    = MarcaFabricante.objects.filter(name=fab_name).first()

            producto, created = Producto.objects.get_or_create(
                sku=sku,
                defaults={
                    'name':                    name,
                    'description':             desc,
                    'categoria':               categoria,
                    'subcategoria':            subcategoria,
                    'marca_fabricante':        marca_fab,
                    'tipo_parte':              tipo_parte,
                    'unidad_medida':           unidad,
                    'price':                   precio,
                    'cost':                    costo,
                    'precio_mayoreo':          mayoreo,
                    'codigo_barras':           cod_barras if cod_barras else sku,
                    'numero_parte_oem':        num_oem,
                    'ubicacion_almacen':       ubicacion,
                    'es_universal':            es_universal,
                },
            )

            if created:
                # Add fitment / compatibility
                for marca_n, modelo_n in motos:
                    modelo = ModeloMoto.objects.filter(
                        marca__name=marca_n, modelo=modelo_n
                    ).first()
                    if modelo:
                        CompatibilidadPieza.objects.get_or_create(
                            producto=producto, modelo_moto=modelo
                        )
                created_count += 1
                self.stdout.write(f'  ✓ [{sku}] {name}')
            else:
                self.stdout.write(f'  → Ya existe: [{sku}]')

        self.stdout.write(self.style.SUCCESS(f'  {created_count} productos nuevos creados.'))
