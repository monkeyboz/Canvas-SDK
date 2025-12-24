//creates elements for the dom
function createElement(el,atr){
    try{
        var elm = document.createElement(el);
        for(var i in atr){
            elm.style[i] = atr[i];
        } 
        return elm;
     }catch(ex){
        console.log(ex)
     }
}
//stores images for compression, used for optimizing
//image displaying
class imageCompress{
    constructor(files){
    console.log(files)
        this.files = files;
        this.images = [];
        this.indexes = [];
        this.compress();
    }
    //pixel storage compression algorithm
    /* for each image the pixels are compared with
       the same pixel position, and each pixel is given
       an active or inactive flag.
     */
    //the end result is stored in a comparison array
    compress(){
        var canvas = createElement("canvas");
        var ctx = canvas.getContext("2d",{"willReadFrequently":true});
        var images = [];
        for(var i in this.files){
            canvas.width = this.files[i].width;
            canvas.height = this.files[i].height;
            ctx.drawImage(this.files[i],0,0);
            console.log(i)
            images.push(ctx.getImageData(0,0,canvas.width,canvas.height).data);
        }
        var d = 0;
        var z = [];
        for(var i in images){
            for(var j = 0; j < images[i].length; j+=4){
                if(!z[j]) z[j] = [];
                z[j] = images[i][j];
            }
        }
    }
}
//screen class - used to create the screen
class screen{
    //constructor for the screen class
    constructor(el,height,width){
        this.d = new drawer();
        this.canvas = createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.canvas.parent = this;
        this.canvas.listener = new listener(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        this.drawer = new drawer(this.ctx);
        el.appendChild(this.canvas);
        this.scenes;
        this.files = {images:{},audio:{},iloaded:[]};
        this.currScene = -1;
        this.selectedScene = "main";
        this.state = null;
        this.stateS = "updateProgress";
        this.loop();
    }
    //state changer
    set stateS(v){
        if(v == "updateProgress" || v == "render"){
            this.state = v;
        }else{
            console.log(v);
        }
    }
    //loadScenes function for loading and rendering the scenes
    loadScenes(scenes){
        this.scenes = scenes;
        for(var i in this.scenes){
            if("images" in this.scenes[i]) this.setupFileSection("images",i);
            if("audio" in this.scenes[i]) this.setupFileSection("audio",i);
        }
        this.loadFiles();
    }
    setupFileSection(type,i){
        for(var m in this.scenes[i][type]){
            this.files[type][i+":"+m] = this.scenes[i][type][m];
        }
            
    }
    //load images
    loadImg(info,type,response){
        var img = new Image();
        img.onload = (e)=>{
            info = info.split(":");
            this.scenes[info[0]][type][info[1]] = img;
            this.files.iloaded.push(img);
        }
        img.src = URL.createObjectURL(response);
    }
    //load audio
    loadAudio(info,type,response){
        var audio = URL.createObjectURL(response);
        audio = new Audio(audio);
    }
    //load file using http request
    loadFile(info,type){
        var xhr = new XMLHttpRequest();
        xhr.open("GET",this.files[type][info],true);
        xhr.responseType = "blob";
        xhr.timeout = 50000;
        var file_name = this.files[type][info];
        //onload info
        xhr.onload = ()=>{
            if(type == "images"){
                this.loadImg(info,type,xhr.response);
            }else{
                this.loadAudio(info,type,xhr.response)
            }
            ++this.files.loaded;
        }
        //on error listener
        xhr.onerror = function(e){
            var keys = Object.keys(e);
            keys.forEach((m)=>{
                console.log(file_name+" "+m+":"+e[m]);
            });
        }
        //on progress listener
        xhr.onprogress = (e)=>{
            if(e.total != 0){
                this.files[type][info] = [e.loaded,e.total,file_name];
            }
        }
        xhr.send();
    }
    //load files in the scenes
    loadFiles(){
        console.log("files loading...");
        var Tkeys = Object.keys(this.files);
        this.files.loaded = 0;
        this.files.total = 0;
        var files = Tkeys;
        Tkeys.forEach((type)=>{
            files[type] = Object.keys(this.files[type]);
            this.files.total += files[type].length;
        });
        files.forEach((type)=>{
            files[type].forEach((info)=>{
                this.loadFile(info,type);
            });
        });
        console.log(this.files.total)
    }
    //request animation loop
    loop(){
        this[this.state]();
        requestAnimationFrame(this.loop.bind(this));
    }
    //update loading progress
    updateProgress(){
        var percentage = 0;
        var total = [0,0];
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height)
        var l = 13;
        for(var t in this.files){
            for(var i in this.files[t]){
                if(i != "total" && i != "loaded" && t != "iloaded" && typeof this.files[t][i][0] !== "string"){
                    if(typeof this.files[t][i].length != "undefined"){
                        percentage += (this.files[t][i][1] !== 0)?this.files[t][i][0]/this.files[t][i][1]:0;
                    }
                }
            }
        }
        percentage = (percentage/this.files.total);
        this.ctx.fillStyle = "#000";
        this.ctx.fillRect(0,0,this.canvas.width*percentage,10);
        this.ctx.fillText(this.files.loaded+" out of "+this.files.total+" "+(100*percentage).toFixed(2)+"%",(this.canvas.width/2)-100,60);
        this.ctx.fillText((total[0]/1000000).toFixed(2)+"MB/"+(total[1]/1000000).toFixed(2)+"MB",0,80);
        
        if(percentage > 0.99){
            this.stateS = "render";
            this.compressImages(this.files.iloaded);
        }
    }
    compressImages(files){
        this.compressed = new imageCompress(files);
    }
    //setupScene function for getting all the scenes
    setupScene(attr){  
        this.scene = new scene(attr,this.drawer,this.scenes.templates);
    }
    //animate scene
    animateScene(){
        //this.scene.animate();
    }
    
    //renders the screen
    render(){
        this.clear();
        this.ctx.fillStyle = "#000";
        if(this.selectedScene != this.currScene){
          this.currScene = this.selectedScene;
          this.setupScene(this.scenes[this.selectedScene]);     
        }else{
          this.setupScene(this.scenes[this.selectedScene]);
          //this.animateScene(this.scenes[this.selectedScene]);
        }
    }
    //clear screen
    clear(){
        this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
}
//scene class - used for building scenes
class scene{
    //constructor for scene obj
    //var attr: object with the different items on 
    //        the screen
    //var d: drawer class used to draw items on screen
    constructor(attr,d,templates){
    console.log(attr)
        Object.keys(attr).forEach((m)=>{ console.log(m)})
        this.templates = templates;
        this.d = d;
        this.audioPlaying = false;
        this.objs = [];
        this.build(attr);
    }
    //animation function
    animate(){
        for(var i in this.attr.objs){
            var obj = this.attr.objs[i];
            if("animation" in obj){
                if(typeof obj.state != "undefined"){
                    obj.state = "animating";
                }
            }
        }
    }
    moveAttr(attr,dest){
        var m = [...dest];
        var v = [...attr];
        if(attr.length > dest.length){
            var holder = m;
            m = v;
            v = holder;
        }
        
        for(var i in v){
            m[i] = m[i]+v[i];
        }
        return m;
    }
    //used to build the scene on the screen
    //var attr: holds the attributes of the scene objs
    //
    /* ----- structure of attr ------
        {name:"scene name",
            objs:[
                {type:"ctx obj draw type",
                attr:["attributes of draw type"],
                ** optional **
                action:"action linked to an event"}
            ]
        }
    */
    build(attr,ptemp){
        //loops through the items being placed on 
        //the screen. loop through the audio, then the images
        /*for(var i in attr.audio){
           // console.log("playing")
        }*/
        for(var i in attr.objs){
            if("template" in attr.objs[i]){
               var temp = JSON.parse(JSON.stringify(this.templates[attr.objs[i].template]));
               for(var m in temp.objs){
                   temp.objs[m].attr = this.moveAttr(attr.objs[i].attr,temp.objs[m].attr);
                   temp.objs[m].info = attr.objs[i].info;
                   if("template" in temp.objs[m]){
                       var intemp = JSON.parse(JSON.stringify(this.templates[temp.objs[m].template]));
                       intemp.info = temp.objs[m].info;
                       intemp.attr = this.moveAttr(intemp.attr,temp.objs[m].attr);
                       if(intemp.type == "drawImage"){
                           intemp.src = attr.objs[i].info["image"];
                       }
                       if(intemp.type == "fillText"){
                           intemp.attr = [attr.objs[i].info[m],...intemp.attr];
                           ["font","fillStyle"].forEach((q)=>{
                               intemp[q]= (temp.objs[m][q])?temp.objs[m][q]:intemp[q];
                               console.log(q)
                           })
                       }
                       if("action" in attr.objs[i]){
                           intemp.action = attr.objs[i].action;
                           if("mainOption" in attr.objs[i]) temp.mainOption = attr.objs[i].mainOption;
                       }
                       this.buildObj(intemp,attr,intemp.info)
                       /*holder = temp.objs[m].attr;
                       for(var l in intemp.attr){
                           temp.objs[m].attr[l] = (temp.objs[m].attr[l])?temp.objs[m].attr[l]+intemp.attr[l]:intemp.attr[l];
                       }*/
                   }else{
                       this.computeTemp(temp,attr,i,m);
                   }
               }
               this.computeTemp(temp,attr,i);
            }else{
               if("mainOption" in attr.objs[i]){
                   if(!attr.objs[i].info) attr.objs[i].info = {};
                   attr.objs[i].info.mainOption = attr.objs[i].mainOption;
               }
               this.buildObj(attr.objs[i],attr,attr.objs[i].info);
            }
        }
    }
    computeAttr(obj,attr,i,a){
        var t = JSON.parse(JSON.stringify(obj));
            if("action" in t || "action" in attr.objs[i]) t.action = attr.objs[i].action;
            switch(t.type){
                case "fillText":
                    var v = [...t.attr.slice(-2)];
                    for(var j in attr.objs[i].attr){
                        v[j] += attr.objs[i].attr[j];
                    }
                    t.attr = [attr.objs[i].info[a],...v];
                    break;
                case "drawImage":
                    var m = {...t}
                    t.src = attr.objs[i].info[a];
                    var l = [...t.attr];
                    for(var j in attr.objs[i].attr){
                        l[j] = attr.objs[i].attr[j]+l[j]
                    }
                    t.attr = l;
                    break;
                default:
                    //temp.objs[a].type = ;
                    break;
            }
            if("mainOption" in attr.objs[i])attr.objs[i].info.mainOption = attr.objs[i].mainOption;
            this.buildObj(t,attr,attr.objs[i].info)
    }
    computeTemp(temp,attr,i){
        for(var a in temp.objs){
            this.computeAttr(temp.objs[a],attr,i,a);
        }
    }
    buildObj(obj,attr,info){
        if(!("type" in obj)) return
            var action = obj.action;
            if(obj.type == 'drawImage' && obj.attr.length >= 4){ 
                this.d.drawObject(obj.type,obj.attr,attr.images[obj.src]);
            }else{
                var styles = {};
               ["fill","font"].forEach((m)=>{
                   if(typeof obj[m] != "undefined") styles[m] = obj[m];
               });
               this.d.setStyle(styles);
               this.d.drawObject(obj.type,obj.attr);
            }
           if(action){
              if(obj.type == "drawImage"){ 
                 var size = (obj.attr.length<4)?
                     obj.attr : obj.attr.slice(-6);
                 this.objs.push([size,action]);
              }else{
                  this.objs.push([obj.attr,action]);
              }
              if(info) this.objs[this.objs.length-1].push(info);
           }
    }
}
//event listener class - used to register and compute 
//events on the screen
class listener{
    //listener constructor
    constructor(parent){
        this.parent = parent;
    }
    //set event listener
    setListeners(atr){
        for(var i in atr){
            this.parent.addEventListener(i,atr[i]);
        }
    }
}
//drawer class - used to draw items on the screen
class drawer{
    //constructor for drawer class - uses the canvas 
    //context object passed to it to create objects on 
    //the canvas
    constructor(ctx){
        this.ctx = ctx;
    }
    setStyle(styles){
        if(styles.fill){
            this.ctx.fillStyle = styles.fill;
        }
        if(styles.font){
            this.ctx.font = styles.font;
        }
    }
    //used to drawer objects.
    //var type: ctx draw object type
    //var atr: attributes for the draw obj type
    drawObject(type,atr,img){
        try{
        switch(type){
            case 'drawImage':
                try{
                    this.ctx[type](img,...atr);
                }catch(e){
                    console.log(e,type,img)
                }                               
                break;
            default:
                this.ctx[type](...atr);
                break;
            }
        }catch(ex){
            console.log(type,ex.message);
        }
    }
    editObject(type,atr,img=null){
        drawObj(type,atr,img);
    }
}
