//game class extends screen - used to create game 
//elements
class game extends screen{
    //game construct
    constructor(el,width,height,scenes,p){
        super(el,width,height); //parent constructor
        this.canvas.listener.setListeners({
            //click:(el)=>this.click(el),
            touchstart:(el)=>{ this.click(el) }
        });
        this.player = p;
        this.loadScenes(scenes);
    }
    //checkCollisions function
    checkCollisions(click){
        var check = this.canvas.parent.scene;
        for(var i in check.objs){
            var obj = check.objs[i][0]
            if(click.x >= obj[0] &&
           click.x <= obj[0]+obj[2] && 
           click.y >= obj[1] && click.y <= obj[1]+obj[3]){
                var action = String(check.objs[i][1]);
                //action = action.split(":");
                this[action]((check.objs[i].length >2)?check.objs[i][2]:null);
                
            }else{
                //console.log(check.objs[i][0]);
            }
        }
    }
    //changeScreen function
    changeScreen(screen){
        this.clear();
        if(typeof screen == "string"){
            this.setupScene(this.scenes[screen]);
        }else{
            var test = this.scenes[screen.mainOption];
            this.selectedScene = screen.mainOption;
            for(var i in test.objs){
                var obj = test.objs[i];
                if("template" in obj){
                    test.objs[i].attr = obj.attr;
                    var variables = screen[1].split("|");
                    var template = this.scenes.templates[obj.template];
                    for(var m in template.objs){
                        template.objs[m].text = variables[m];
                        var tattr = template.objs[m].attr;
                        template.objs[m].attr =  [template.objs[m].text,tattr[0]+obj.attr[0],tattr[1]+obj.attr[1]];
                    }
                    this.setupScene(template);
                }else{
                    this.setupScene(test);
                }
            }
        }
    }
    onComplete(screen,completed){
        if(completed){
            this.clear();
            this.setupScreen(scenes[screen]);
        }
    }
    //used to setup the click events for the screen
    click(el){
        var click;
        if('touches' in el){
            click = {x:el.touches[0].clientX,y:el.touches[0].clientY};
        }else{
            click = {x:el.clientX,y:el.clientY};
        }
        this.checkCollisions(click);
    }
}
