# Archive — essais ciel

Prototypes / versions non actives. Ciel courant : `SanctuaryUniverse` + layers constellation.

## Pré-WebGL
- `SanctuaryCanvasSky.tsx` — canvas 2D + orbes vidéo
- `SanctuaryLueurSky.tsx` — layout DOM de LueurOrbs

## Filantes
- `ShootingStarsPremiumV1.tsx` — tête `Points` additive (flashy ; gros point blanc possible)  
  Actif = **mix Kubrick × Premium** dans `constellation/ShootingStars.tsx`.  
  Restaurer Premium V1 : recopier ce fichier vers `constellation/ShootingStars.tsx`.

## Gaz
- `NebulaGasCombinedV1.tsx` — teal + mauve dans **un** shader  
  Actif = `NebulaGasTeal` + `NebulaGasMauve` (layers séparés).  
  Restaurer : recopier vers `constellation/NebulaGas.tsx` et rebrancher un seul `ParallaxLayer`.

## Constellation
- `constellation-orb-cloud-v1/` — nuage d’orbes + drag (avant Éclipse Résonnante Acte I)  
  Voir README du dossier pour restaurer.
