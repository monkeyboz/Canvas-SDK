class player{
   constructor(data,player){
       this.d = data;
       this.stats = this.d.stats;
       this.types = this.d.types;
       this.scales = this.d.scale;
       this.player = player;
      
      this.data = {recruit:[],power:[],cards:[]};
      this.loadPlayer();
   }
    graph(id,ctx,style){
        ctx.strokeStyle = style;
        for(var i in this.data[id]){
         if(i == 0){
            ctx.beginPath();
            ctx.moveTo(10,200-this.data[id][i]/5);
         }else{
            ctx.lineTo(((i+1)*(20/this.data[id].length))+10,200-this.data[id][i]/6);
         }
      }
      ctx.stroke();
    }
   displayData(){
      var canvas = document.createElement("canvas");
      var ctx = canvas.getContext("2d");
      canvas.width = 400;
      canvas.height = 400;
       var color = {recruit:"ff0000",power:"00ff00",cards:"0000ff"};
      Object.keys(this.data).forEach((v)=>this.graph(v,ctx,"#"+color[v]));
      this.dbug.appendChild(canvas);
   }
    loadChars(i){
        var ch = {...this.d.characters[i]};
        ch.stats = this.types[ch.type];
        var stats = {...ch.stats};
        return [ch,stats];
    }
   loadPlayer(){
      this.player.total = 0;
       var currI = this.data.power.length;
      for(var i in this.player.cards){
          var cards = this.player.cards[i];
          for(var l in cards){
              var cstats = this.cardStats(i,l,cards[l]);
              for(var m in this.stats){
                  baseStats[i] += cstats[m];
              }
          }
       }
       this.data.power[currI] = this.player.total/100;
   }
   recruit(test=5){
      var keys = Object.keys(this.scales);
      if(this.player.credits <= 0) return;
      this.player.credits -= 100;
      var ch = Object.keys(this.d.characters);
      this.data.recruit[this.data.recruit.length] = 5;
      var currI = this.data.cards.length;
      this.data.cards[currI] = (currI > 0)?this.data.cards[currI-1]+5:5;
      for(var m = 0; m < test; ++m){
         var rand = ((Math.random()*(keys.length-1))+1).toFixed(1);
         for(var i = keys.length-1; i >= 0;--i){
             var prob = (keys.length/(i+1));
             if(rand <= prob){
                var char = ch[(Math.random()*2).toFixed(0)];
                if(!this.player.cards[char]) this.player.cards[char] = {};
                if(!this.player.cards[char][keys[i]]){
                   this.player.cards[char][keys[i]] = 1;
                }else{
                   ++this.player.cards[char][keys[i]];
                }
                break;
             }
         }
      }
      this.loadPlayer();
   }
   merge(){
      var keys = Object.keys(this.scales);
      for(var i in keys){
         if(typeof keys[i-1] != "undefined"){
            Object.keys(this.player.cards).forEach((v)=>{
               if(keys[i-1] in this.player.cards[v]){
                  if("merge" in this.scales[keys[i]] && this.player.cards[v][keys[i-1]]){
                     var merge = Math.floor(this.player.cards[v][keys[i-1]]/this.scales[keys[i]].merge);
                     if(merge > 0){
                        this.player.cards[v][keys[i-1]] -= this.scales[keys[i]].merge*merge;
                        if(!this.player.cards[v][keys[i]]) this.player.cards[v][keys[i]] = 0;
                        this.player.cards[v][keys[i]] += merge;
                         this.data.cards[this.data.cards.length] = this.data.cards[this.data.cards.length-1]+(merge-(this.scales[keys[i]].merge*merge));
                     }
                  }
               }
            });
         }
      }
      this.loadPlayer();
   }
    calculateBattleStats(){
        var cards = {...this.player.cards};
        var stats = {};
        var baseStats = {...this.stats};
        Object.keys(baseStats).forEach((i)=>{
            stats[i] = 0;
        })
        for(var v in this.player.cards){
            var cards= this.player.cards[v];
            for(var l in cards){
                var cstats = this.cardStats(v,l,cards[l]);
                for(var i in this.stats){
                    baseStats[i] += cstats[i];
                }
            }
        }
    }
    cardStats(char,card,total){
        var stats = {...this.stats};
        for(var i in stats){
            stats[i] += (this.stats[i]+
            (this.types[this.d.characters[char].type][i]+
            (this.scales[card].all?this.scales[card].all:1)))
            *total;
        }
        return stats;
    }
    battle(m){
        var health = 0;
        
        this.calculateBattleStats();
    }
}