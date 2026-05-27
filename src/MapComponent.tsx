import { useEffect, useRef, useState } from 'react';
import { load } from '@2gis/mapgl';
import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

// демо-ключ от 2ГИС
const API_KEY = 'e95545e3-26e7-4cb3-b655-e4e40d49a6e6';

// стиль из редактора 2ГИС
const MAP_STYLE = '3866410e-d339-4f48-bda7-187f6def8fd7';

// Центр карты — Уфа 
const MAP_CENTER: [number, number] = [55.9578, 54.7388];
const MAP_ZOOM = 13;

//  туристический маршрут по Уфе — 5 точек

const TOURIST_POINTS = [
  {
    id: 1,
    name: 'Монумент Дружбы',
    description: 'Символ Уфы на высоком берегу реки Белой',
    coords: [55.9563, 54.7432] as [number, number],
    emoji: '🏛️',
  },
  {
    id: 2,
    name: 'Национальный музей',
    description: 'Главный исторический музей Башкортостана',
    coords: [55.9658, 54.7371] as [number, number],
    emoji: '🏛️',
  },
  {
    id: 3,
    name: 'Конгресс-холл',
    description: 'Центр деловой и культурной жизни города',
    coords: [55.9712, 54.7290] as [number, number],
    emoji: '🏢',
  },
  {
    id: 4,
    name: 'Гостиный двор',
    description: 'Один из самых известных торговых комплексов в центре Уфы',
    coords: [55.943602, 54.725173] as [number, number],
    emoji: '🛍️',
  },
  {
    id: 5,
    name: 'Клещ Валера',
    description: 'Жанровая скульптура республики Башкортостан',
    coords: [55.948566, 54.734259] as [number, number],
    emoji: '🕷',
  },
];

type Mode = 'dtp-points' | 'heatmap';

export default function MapComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const mapRef = useRef<any>(null);
  const sourceRef = useRef<any>(null);
  const pointLayerRef = useRef<any>(null);
  const heatmapLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const directionsRef = useRef<any>(null);

  const [mode, setMode] = useState<Mode>('dtp-points');
  const [routeBuilt, setRouteBuilt] = useState(false);
  const [dtpVisible, setDtpVisible] = useState(true);
  //const [stats, setStats] = useState({ total: 0, dead: 0, injured: 0, severe: 0 });

  // Инициализация карты 
  useEffect(() => {
    let cancelled = false;

    load().then(async (mapgl) => {
      if (cancelled || !containerRef.current) return;

      // Создаём карту
      const map = new mapgl.Map(containerRef.current, {
        center: MAP_CENTER,
        zoom: MAP_ZOOM,
        key: API_KEY,
        style: MAP_STYLE,
      });
      mapRef.current = map;

      // Доп.задание: плагин Directions
      const { Directions } = await import('@2gis/mapgl-directions');
      const directions = new Directions(map, { directionsApiKey: API_KEY });
      directionsRef.current = directions;

      // Добавляем маркеры туристического маршрута
    // Создаём GeoJSON источник для туристических точек
    const touristGeoJson = {
    type: 'FeatureCollection' as const,
    features: TOURIST_POINTS.map((point) => ({
        type: 'Feature' as const,
        geometry: {
        type: 'Point' as const,
        coordinates: point.coords,
        },
        properties: {
        name: point.name,
        emoji: point.emoji,
        description: point.description,
        number: point.id,
        },
    })),
    };

    const touristSource = new mapgl.GeoJsonSource(map, {
    data: touristGeoJson,
    attributes: { purpose: 'tourist' },
    });
    markersRef.current.push(touristSource as any);

    const touristLayer: any = {
    id: 'tourist-layer',
    filter: [
        'match', ['sourceAttr', 'purpose'], ['tourist'], true, false,
    ],
    type: 'point' as const,
    style: {
        iconImage: 'circle-stroked',    
        iconWidth: [
        'interpolate', ['linear'], ['zoom'],
        10, 12, 
        13, 22,  
        16, 32,   
        ],
        textField: ['get', 'name'],
        textFont: ['Noto_Sans'],
        textColor: '#26de81',           
        textHaloColor: '#0a1a0f',
        textHaloWidth: 2,
        textSize: [
        'interpolate', ['linear'], ['zoom'],
        10, 0,    
        12, 11,   
        14, 14,   
        17, 18,   
        ],
        iconPriority: 200,
        textPriority: 200,
        textOffset: [0, 14],
        
        allowOverlap: false,
        iconAllowOverlap: false,
    },
    };

    map.on('styleload', () => {
    map.addLayer(touristLayer);
    });

      // Загружаем GeoJSON с ДТП
      const rawData = await import('./data/full-data.json');
      const data = rawData as unknown as FeatureCollection<Geometry, GeoJsonProperties>;

      // статистика
      // let dead = 0, injured = 0, severe = 0;
      // data.features.forEach((f) => {
      //   const p = f.properties || {};
      //   dead += p.dead_count || 0;
      //   injured += p.injured_count || 0;
      //   if (p.severity === 'Тяжёлый') severe++;
      // });
      // setStats({ total: data.features.length, dead, injured, severe });

      // источник данных GeoJSON
      const source = new mapgl.GeoJsonSource(map, {
        data,
        attributes: { visible: true },
      });
      sourceRef.current = source;

      // Слой точек ДТП
      const pointLayer: any = {
        id: 'dtp-points-layer',
        filter: [
            'all',
            ['match', ['sourceAttr', 'visible'], [true], true, false],
        ],
        type: 'point' as const,
        style: {
          iconImage: 'dtp',          
          iconWidth: 14,
          textField: ['get', 'severity'],
          textFont: ['Noto_Sans'],
          textColor: '#ffcc00',
          textHaloColor: '#111',
          textHaloWidth: 1.5,
          iconPriority: 100,
          textPriority: 90,
          textOffset: [0, 12],
        },
      };
      pointLayerRef.current = pointLayer;

      // Слой тепловой карты
      const heatmapLayer: any = {
        id: 'dtp-heatmap-layer',
        filter: [
          'match', ['sourceAttr', 'visible'], [true], true, false,
        ],
        type: 'heatmap' as const,
        style: {
          //color: [
            //'interpolate', ['linear'], ['heatmap-density'],
            //0,   'rgba(0, 0, 0, 0)',
            //0.2, 'rgba(0, 100, 255, 0.8)',
            //0.4, 'rgba(0, 200, 200, 1)',
            //0.6, 'rgba(255, 200, 0, 1)',
            //0.8, 'rgba(255, 100, 0, 1)',
            //1,   'rgba(255, 0, 0, 1)',
          //],
          color: [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(0, 0, 0, 0)',
            0.2, '#f8b58b',
            0.4, '#f59e72',
            0.6, '#f2855d',
            0.8, '#ef6a4c',
            1,   '#eb4a40',
          ],
          radius: 22,
          intensity: 0.9,
          opacity: 0.85,
          downscale: 1,
        },
      };
      heatmapLayerRef.current = heatmapLayer;

      map.on('styleload', () => {
        map.addLayer(pointLayer);
      });
    });

    // Очистка при размонтировании компонента
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.destroy());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // Переключение режима точки - тепловая карта
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Удаляем оба слоя если они есть
    try { map.removeLayer('dtp-points-layer'); } catch {}
    try { map.removeLayer('dtp-heatmap-layer'); } catch {}

    // Добавляем нужный
    if (mode === 'dtp-points' && pointLayerRef.current) {
      map.addLayer(pointLayerRef.current);
    } else if (mode === 'heatmap' && heatmapLayerRef.current) {
      map.addLayer(heatmapLayerRef.current);
    }
  }, [mode]);

  // Построение пешеходного маршрута через Directions
  const clearRoute = () => {
    const directions = directionsRef.current;
    if (!directions) return;
    directions.clear();
    setRouteBuilt(false);
  };
  const toggleDtp = () => {
    const map = mapRef.current;
    if (!map) return;

    if (dtpVisible) {
        try { map.removeLayer('dtp-points-layer'); } catch {}
        try { map.removeLayer('dtp-heatmap-layer'); } catch {}
    } else {
        if (mode === 'dtp-points' && pointLayerRef.current) {
        map.addLayer(pointLayerRef.current);
        } else if (mode === 'heatmap' && heatmapLayerRef.current) {
        map.addLayer(heatmapLayerRef.current);
        }
    }
    setDtpVisible(!dtpVisible);
  };
  const buildRoute = async () => {
    const directions = directionsRef.current;
    if (!directions) return;

    try {
        // Directions принимает просто массив координат 
        const points = TOURIST_POINTS.map((p) => p.coords);

        await directions.pedestrianRoute({
          points: points,
          style: {
            routeLineWidth: 4,
            substrateLineWidth: 7,
            haloLineWidth: 10,
          }
        });

        setRouteBuilt(true);

        // После построения маршрута
        setTimeout(() => {
          document.querySelectorAll('.mapgl-marker').forEach((el) => {
            const html = el.innerHTML;
            if (html.includes('>A<') || html.includes('>B<') ||
                html.match(/>\d</)) {
              (el as HTMLElement).style.display = 'none';
            }
          });
        }, 1000);

    } catch (e) {
        console.error('Ошибка маршрута:', e);
        alert('Не удалось построить маршрут. Проверь API ключ — он должен быть активен и иметь доступ к сервису Directions.');
    }
 };

  return (
    <>
      {/* Контейнер карты — занимает весь экран */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Боковая панель управления */}
      <div className="sidebar">

        <h2>🗺️ Карта Уфы</h2>
        <div className="subtitle">ДТП · Туристический маршрут</div>

        {/* Кнопки переключения режима */}
        <div className="mode-buttons">
            <button
                className={`mode-btn ${mode === 'dtp-points' ? 'active' : 'inactive'}`}
                onClick={() => { setMode('dtp-points'); if (!dtpVisible) toggleDtp(); }}
            >
                📍 Точки ДТП
            </button>
            <button
                className={`mode-btn ${mode === 'heatmap' ? 'active' : 'inactive'}`}
                onClick={() => { setMode('heatmap'); if (!dtpVisible) toggleDtp(); }}
            >
                🔥 Тепловая карта
            </button>
        </div>

        <button
            className={`mode-btn ${dtpVisible ? 'active' : 'inactive'}`}
            style={{ width: '100%', marginBottom: 12 }}
            onClick={toggleDtp}
            >
            {dtpVisible ? 'Скрыть ДТП' : 'Показать ДТП'}
        </button>

        {/* Легенда тепловой карты — показывается только в режиме heatmap */}
        {mode === 'heatmap' && (
          <div className="heatmap-legend">
            <div className="stats-title">Плотность ДТП</div>
            <div className="legend-bar" />
            <div className="legend-labels">
              <span>Низкая</span>
              <span>Высокая</span>
            </div>
          </div>
        )}

        {/* Туристический маршрут */}
        <div style={{ marginTop: 14 }}>
          <div className="route-title">Маршрут по Уфе</div>
          <div className="route-list">
            {TOURIST_POINTS.map((point) => (
              <div className="route-item" key={point.id}>
                <div className="route-num">{point.id}</div>
                <div className="route-info">
                  <div className="route-name">{point.emoji} {point.name}</div>
                  <div className="route-desc">{point.description}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            className="build-route-btn"
            onClick={routeBuilt ? clearRoute : buildRoute}
            >
            {routeBuilt ? '❌ Убрать маршрут' : '🗺️ Построить пешеходный маршрут'}
          </button>
        </div>

        {/* Статистика ДТП */}
        {/* <div className="dtp-stats">
          <div className="stats-title">Статистика ДТП</div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number blue">{stats.total}</div>
              <div className="stat-label">Всего<br/>происшествий</div>
            </div>
            <div className="stat-card">
              <div className="stat-number red">{stats.dead}</div>
              <div className="stat-label">Погибших</div>
            </div>
            <div className="stat-card">
              <div className="stat-number orange">{stats.injured}</div>
              <div className="stat-label">Пострадавших</div>
            </div>
            <div className="stat-card">
              <div className="stat-number green">{stats.severe}</div>
              <div className="stat-label">Тяжёлых<br/>случаев</div>
            </div>
          </div>
        </div> */}

      </div>
    </>
  );
}