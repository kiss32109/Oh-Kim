const UTILITY = require('./utility.js');
const ITEM = require('./inventory.js');

/* 필드 클래스 정의 */
Field = function(parent){

    /* 맵 목록과 오브젝트 목록을 속성으로 갖는 필드 객체 */
    var self = {
      parent: parent,
      map: {},
    }

    /* 필드에 디폴트맵 추가 작업 */
    self.setDefaultMap = function(){
      let default_map = Maps.list['main_field'];
      /* 이미 목록에 있는 경우 */
		  for(var i in self.map){
      	if(self.map[i].id === default_map['id']){
      		self.map = [];
      	}
    	}
      self.map = default_map;
    }
    self.isOutOfField = function(gridX, gridY) {
      if(gridX<0 || gridX>=field.ground.pattern.length) { return true; };
      if(gridY<0 || gridY>=field.ground.pattern[0].length) { return true; };
      return false;
    }

    self.getSpecificTile = function(location, field) {
      /* 필드의 크기와 대상 객체의 좌표값을 이용해 각각의 타일 좌표 구하기 */
      var gridX = Math.floor((field.width/2+location.x)/(field.width/30));
      var gridY = Math.floor((field.height/2+location.y)/(field.height/30));
      return [gridX, gridY];
    }

    self.getFrontTile = function(location, field) {
      /* 필드의 크기와 대상 객체의 좌표값을 이용해 각각의 타일 좌표 구하기 */
      var gridX = Math.floor((field.width/2+location.x)/(field.width/30));
      var gridY = Math.floor((field.height/2+location.y)/(field.height/30));
      if(location.direction === 0 && !self.isOutOfField(gridX,gridY+1)) return field.deco.pattern[gridY+1][gridX];
      if(location.direction === 1 && !self.isOutOfField(gridX,gridY-1)) return field.deco.pattern[gridY-1][gridX];
      if(location.direction === 2 && !self.isOutOfField(gridX+1,gridY)) return field.deco.pattern[gridY][gridX+1];
      if(location.direction === 3 && !self.isOutOfField(gridX-1,gridY)) return field.deco.pattern[gridY][gridX-1];
      return;
    }

    self.collision = function(location, field) {
      /* 필드의 크기와 대상 객체의 좌표값을 이용해 각각의 타일 좌표 구하기 */
      var gridX = Math.floor((field.width/2+location.x)/(field.width/30));
      var gridY = Math.floor((field.height/2+location.y)/(field.height/30));

      /* 타일 좌표값 X,Y가 설정된 필드의 범위를 벗어나는 경우 */
      if(self.isOutOfField(gridX,gridY)) { return 'ENTITY'; };

      /* 타일 좌표값 기준, 오버랩된 데코레이션 충돌 감지 */
      if(field.deco.pattern[gridY][gridX].constructor === Object) { return 'PLAYER'; }
      if(field.deco.pattern[gridY][gridX].constructor === String) {
        if(field.deco.pattern[gridY][gridX].includes('4-')) { return 'PLAYER'; }
        if(field.deco.pattern[gridY][gridX].includes('7-')) { return 'PLAYER'; }
       }
      return field.ground.pattern[gridY][gridX];
    }

	return self;
}

/* 오브젝트 클래스 정의 */
Objects = function(id, name, deco_number, event, hp, hpMAX, droppable){
  var self = {
  	id: id,
  	name: name,
    deco_number: deco_number,
    event: event,
    /* 필드 객체 정의 */
    hp: hp,
    hpMAX: hpMAX,
    droppable: droppable,
  }
  Objects.list[self.id] = self;
  return self;
}
Objects.createObjectHasDiedItems = function(player) {
  /* 플레이어가 죽은 타일 인덱스값 구하기 */
  var diedGridXY = player.field.getSpecificTile(player.location, player.field.map.field);
  console.log(player.field.map.field.deco.pattern[diedGridXY[1]][diedGridXY[0]]);
  /* 필드 데코레이션 해당 타일값에 새로 생성한 오브젝트 배치하기 */
  player.field.map.field.deco.pattern[diedGridXY[1]][diedGridXY[0]] = new Objects(
    UTILITY.getGUID(),
    player.id + "'s ITEMS",
    '6-17',
    function(){},
    10,
    10,
    player.inventory.items,
  );
  console.log(diedGridXY);
  console.log(player.field.map.field.deco.pattern[diedGridXY[1]][diedGridXY[0]]);
  /* 사용자들에게 오브젝트 변경사항 전달하기 */
  for(var i in SOCKET_LIST){
    SOCKET_LIST[i].emit('mapChanged', player.field.map.field.deco);
  }
}
Objects.createObjectHasRandomItems = function(id) {
  switch (id) {
    case 'supply_box':
      return new Objects(
        UTILITY.getGUID(),
        'SUPPLY BOX',
        '6-17',
        function(){},
        10,
        10,
        setRandomDroppableItem(),
      );
    default:
      break;
  }
}
Objects.interaction = function(socket) {

  socket.on('updateObjects', function(data) {
    /* 데이터로 넘어온 오브젝트 ID와 선택된 ITEM ID를 통해
       해당 오브젝트 객체를 찾고 목록에서 제거 */
    for(var index in Objects.list) {
      if(data.id === Objects.list[index].id) {
        delete Objects.list[index].droppable[data.item];
        if(Object.keys(Objects.list[index].droppable).length===0) {
          delete Objects.list[index];
          for(var indexMAP in Maps.list) {
            for(var indexY=0; indexY<Maps.list[indexMAP].field.deco.pattern.length; indexY++) {
              for(var indexX=0; indexX<Maps.list[indexMAP].field.deco.pattern[indexY].length; indexX++) {
                if(Maps.list[indexMAP].field.deco.pattern[indexY][indexX].constructor===String){ continue; }
                if(Maps.list[indexMAP].field.deco.pattern[indexY][indexX].constructor===Object) {
                  if(Maps.list[indexMAP].field.deco.pattern[indexY][indexX].id === data.id) {
                    Maps.list[indexMAP].field.deco.pattern[indexY][indexX] = '';
                    for(var i in SOCKET_LIST){
                      SOCKET_LIST[i].emit('mapChanged', Maps.list[indexMAP].field.deco);
                    }
                  }
                }
              }
            }
          }
        }
        for(var i in SOCKET_LIST){
          SOCKET_LIST[i].emit('ObjectChanged', Objects.list[index]);
        }
      }
    }
  });
}
Objects.list = {};
/* /맵 클래스 정의 */

var setRandomDroppableItem = function() {
  var droppableItems = ['healing_potion_small', 'mana_potion_small','energy_potion_small',
                        'healing_potion_medium', 'mana_potion_medium', 'energy_potion_medium',
                        'chest_leather_vest_yellow_cloth', 'head_farmer_hat_straw_cloth', 'legs_leather_white_cloth'
                      ];
  var tmpDroppable = {};
  var count = UTILITY.randomRange(1,5);
  var index = 0;
  while(index<count) {
    var key = droppableItems[UTILITY.randomRange(0,8)];
    if(tmpDroppable[key]===undefined) {
      tmpDroppable[key] = UTILITY.clone(Item.list[key]);
      tmpDroppable[key].amount++;
    }
    else {
      tmpDroppable[key].amount++;
    }
    index++;
  }
  return tmpDroppable;
}

/* 맵 클래스 정의 */
Maps = function(id, name, event, field){
	var self = {
		id: id,
		name: name,
    event: event,
    /* 필드 객체 정의 */
    field: field,
	}
	Maps.list[self.id] = self;
	return self;
}
Maps.list = {};
/* /맵 클래스 정의 */

var setPatternWithObjects = function() {
  var basePattern = [
    ['7-0','7-1','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','4-0','4-1','4-2','4-3','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','4-16','4-17','4-18','4-19','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','4-32','4-33','4-34','4-35','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','4-48','4-49','4-50','4-51','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],  //16, 20
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
    ['7-16','','','','','','','','','','','','','','','','','','','','','','','','','','','','',''],
  ];
  for (var Y = 0; Y < basePattern.length; Y++) {
    for (var X = 0; X < basePattern[Y].length; X++) {
      if(basePattern[Y][X] === '') {
        if(Math.random()<0.01){
          basePattern[Y][X] = Objects.createObjectHasRandomItems('supply_box');
        }
      }
    }
  }
  return basePattern;
}

Maps(
  "main_field",
  "Main Field",
  function(player){},
  field = {

    columns:30,
    height:1440,
    width:1440,

    ground: {

      pattern: [
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','4-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41'],
        ['1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41'],
        ['1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41'],
        ['1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','4-22','1-23','2-40','3-41','4-42','3-43','1-44','2-45','3-46','4-47','3-36','1-37','2-38','3-39','4-40','1-41'],
        ['4-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','4-24','4-25','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','4-56','4-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41'],
        ['1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41'],
        ['1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24'],
        ['1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41','1-42','1-43','1-44','1-45','1-46','1-47','1-36','1-37','1-38','1-39','1-40','1-41'],
        ['1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57','1-58','1-59','1-60','1-61','1-62','1-63','1-52','1-53','1-54','1-55','1-56','1-57'],
        ['1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9','1-10','1-11','1-12','1-13','1-14','1-15','1-4','1-5','1-6','1-7','1-8','1-9'],
        ['1-20','1-21','1-22','1-23','1-24','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','4-23','1-24','1-4','1-25','1-26','1-27','1-28','1-29','1-30','1-31','1-20','1-21','1-22','1-23','1-24']

              ],
      tiles: {
          imgs: ['ground_grounds_1',
                'ground_grounds_2',
                'ground_paths_cobble_1',
                'ground_paths_grass_1',
                'ground_water',
                'ground_cliffs'],
          columns: 16,
          height: 16,
          width: 16,
      },
    },

    deco: {
      pattern: setPatternWithObjects(),
      tiles: {
          imgs: ['ground_grounds_1',
                'ground_grounds_2',
                'ground_paths_cobble_1',
                'ground_paths_grass_1',
                'ground_water',
                'ground_cliffs',
                'collectible_idle_body_boxes',
                'deco_ruins',
                '',
              ],
          columns: 16,
          height: 16,
          width: 16,
            },
    },
  });