const socket = io();
var userID = "";
var userName = "";
var bodyID = "";
var length = 0;
var dragging = false;
var lastX, lastY;
var zoom = 1;
var angleX = 0, angleY = 0;
var P = 0;
var V = 0;

let host = document.body;

let notificationsDiv = document.createElement("div");
notificationsDiv.className="notificationsDiv";
notificationsDiv.id="notificationsDiv";
host.appendChild(notificationsDiv);

let naziv = document.createElement("h1");
naziv.id = "header";
naziv.innerHTML="GeometrySolver";
// naziv.innerHTML=`${window.devicePixelRatio} DPR Rezolucija prikaza ${window.innerWidth}x${window.innerHeight}`;
notificationsDiv.appendChild(naziv);

let notification = document.createElement("div");
notification.className = "notification";
notification.id = "notification";
notificationsDiv.appendChild(notification);

let glavniDiv = document.createElement("div");
glavniDiv.className="glavniDiv";
glavniDiv.id = "glavniDiv";
host.appendChild(glavniDiv);

let canvas = document.createElement("canvas");
canvas.id = "platno3D";
glavniDiv.appendChild(canvas);

drawPoprecni();

clearPoprecni();

var menu = document.createElement("div");
menu.className="menuDiv";
menu.id="menuDiv";
glavniDiv.appendChild(menu);
registerLoginForm();
commentSection();

let height = canvas.clientHeight;
let width = canvas.clientWidth;
canvas.width = width;
canvas.height = height;

canvas = document.querySelector("canvas");
var gl = canvas.getContext("webgl", { antialias: false });

if(!gl)
{
    throw new Error("WEBGL NOT SUPPORTED");
}

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertexShader, `
precision mediump float;
attribute vec3 position;
attribute vec3 normal;
attribute vec3 color;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

uniform mat4 matrix;
uniform mat4 normalMatrix;

void main() {
    vNormal = (normalMatrix * vec4(normal, 1)).xyz;
    vPosition = (matrix * vec4(position, 1)).xyz;
    vColor = color;
    gl_Position = matrix * vec4(position, 1);
}
`);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragmentShader,`
precision mediump float;
const vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
const float ambient = 0.2;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
    vec3 worldNormal = normalize(vNormal);
    float diffuse = max(0.0, dot(worldNormal, lightDirection));
    float brightness = ambient + diffuse;
    vec3 finalColor = vColor * brightness;
    gl_FragColor = vec4(finalColor, 1.0);
}
`);
gl.compileShader(fragmentShader);

const resizeObserver = new ResizeObserver(onResize);
resizeObserver.observe(canvas, {box: 'content-box'});

const canvasToDisplaySizeMap = new Map([[canvas, [width, height]]]);
 
function onResize(entries) {
  for (const entry of entries) {
    let width;
    let height;
    if (entry.devicePixelContentBoxSize) {
      width = entry.devicePixelContentBoxSize[0].inlineSize;
      height = entry.devicePixelContentBoxSize[0].blockSize;
    } else if (entry.contentBoxSize) {
      if (entry.contentBoxSize[0]) {
        width = entry.contentBoxSize[0].inlineSize;
        height = entry.contentBoxSize[0].blockSize;
      } else {
        width = entry.contentBoxSize.inlineSize;
        height = entry.contentBoxSize.blockSize;
      }
    } else {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    }
    const displayWidth = Math.round(width);
    const displayHeight = Math.round(height);
    canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight]);
  }
}

function resizeCanvasToDisplaySize(canvas) {
    const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas);
   
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
   
    if (needResize) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
    }
   
    return needResize;
}

canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
});

canvas.addEventListener('mouseup', () => {
    dragging = false;
});

canvas.addEventListener('mousemove', (event) => {
    if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        angleX += dx * (Math.PI/180);
        angleY -= dy * (Math.PI/180);
        if(bodyID=="")
        {
            drawGrid(false);
        }
        else
        {
            if(length==0)
            {
                drawGrid(false);
            }
            else
            {
                renderModel(bodyID);
            }
        }
    }
});

canvas.addEventListener('wheel', (event) => {
    zoom -= event.deltaY * -0.01;
    zoom = Math.min(Math.max(-4, zoom), 16);
    if(bodyID=="")
    {
        drawGrid(false);
    }
    else
    {
        if(length==0)
        {
            drawGrid(false);
        }
        else
        {
            renderModel(bodyID);
        }
    }
});

//unloadovanje struktura za matrice jer drugacije ne radi
const { mat2, mat2d, mat3, mat4, quat, quat2, vec2, vec3, vec4 } = glMatrix;

var vertexData= [];

var colorData = [];

var normalData = [];

socket.on("message", message =>{
    let notification = document.getElementById("notification");
    notification.style.backgroundColor = "rgb(20, 150, 20)";
    notification.innerHTML = message;
    setTimeout(resetNotification,2000);
});

socket.on("comment",comment=>{
    let listaKomentara = document.getElementById("commentList");
    listaKomentara.value+=comment+"\n\n";
    listaKomentara.scrollTop = listaKomentara.scrollHeight;
});

socket.on("figureAdded",body=>{
    length++;
    renderModel(body.bodyID);
});

socket.on("figureDeleted", bodyID=>{
    length--;
    if(length==0)
    {
        drawGrid(false);
    }
    else
    {
        renderModel(bodyID);
    }
});

function redraw(componentID,componentClassName)
{
    let component = document.getElementById(componentID);
    let parent = component.parentNode;
    parent.removeChild(component);

    component = document.createElement("div");
    component.className=componentClassName;
    component.id=componentID;
    parent.appendChild(component);

    return component;
}

function remove(componentID)
{
    let component = document.getElementById(componentID);
    let parent = component.parentNode;
    parent.removeChild(component);
}

function registerLoginForm()
{
    let registerLoginDiv = document.createElement("div");
    registerLoginDiv.className = "registerLoginDiv";
    registerLoginDiv.id = "registerLoginDiv";
    menu.appendChild(registerLoginDiv);

    let divTmp = document.createElement("div");

    let userLabel = document.createElement("label");
    userLabel.innerHTML = "Username:";
    divTmp.appendChild(userLabel);

    var usernameInput = document.createElement("input");
    usernameInput.id = "usernameInput";
    divTmp.appendChild(usernameInput);

    registerLoginDiv.appendChild(divTmp);
    divTmp = document.createElement("div");

    let btnRegister = document.createElement("button");
    btnRegister.innerHTML="Register";
    btnRegister.onclick =async (ev) =>{
        
        if(usernameInput.value!="")
        {
            var newUser = {
                username: usernameInput.value
            };
            let notification = document.getElementById("notification");
            await fetch(`/getUserByUsername?username=${usernameInput.value}`)
            .then(response => response.json())
            .then(data => {
                    if(data!=null && data.username==usernameInput.value)
                    {
                        notification.style.backgroundColor = "rgb(180, 138, 32)";
                        notification.innerHTML = "Account with this username is already registered";
                        setTimeout(resetNotification, 2000);
                    }
                    else
                    {
                        fetch("/createUser", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(newUser),
                        })
                        .then(response => response.json())
                        .then(data => {
                            okNotification(`Account ${newUser.username} registered successfully`);
                        })
                        .catch(error => {
                            console.error("Error registering user:", error);
                        });
                    }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
        }
    }
    divTmp.appendChild(btnRegister);

    let btnLogin = document.createElement("button");
    btnLogin.innerHTML="Login";
    btnLogin.onclick = async (ev) =>{
        if(!usernameInput.value=="")
        {
            await fetch(`/getUserByUsername?username=${usernameInput.value}`)
                .then(response => response.json())
                .then(data => {
                    if(data!=null)
                    {
                        userID = data._id;
                        userName = data.username;
                        okNotification(`Welcome ${userName}`);
                        let tabsDiv = document.createElement("div");
                        tabsDiv.className = "tabSelector";
                        tabsDiv.id = "tabSelector";
                        menu.appendChild(tabsDiv);
                        let tabButton = document.createElement("button");
                        tabButton.className = "tabBtn";
                        tabButton.innerHTML = "My projects";
                        tabsDiv.appendChild(tabButton);
                        tabButton = document.createElement("button");
                        tabButton.className = "tabBtn";
                        tabButton.innerHTML = "Settings";
                        tabsDiv.appendChild(tabButton);
                        document.getElementById("menuDiv").appendChild(tabsDiv);
                        redraw("registerLoginDiv","menuDiv");


                        let buttonsDiv = document.createElement("div");

                        let backBtn = document.createElement("button");
                        backBtn.innerHTML = "Back";
                        buttonsDiv.appendChild(backBtn);
                        let logoffBtn = document.createElement("button");
                        logoffBtn.innerHTML = "Log off";
                        buttonsDiv.appendChild(logoffBtn);
                        document.getElementById("registerLoginDiv").appendChild(buttonsDiv);
                        modelCreateAndSelect();
                        
                        backBtn.onclick=(ev)=>goBackAction();
                        logoffBtn.onclick=(ev)=>logOffAction();
                    }
                    else
                    {
                        errorNotification(`Account with username ${usernameInput.value} doesn't exist`);
                    }
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
        }
    }
    divTmp.appendChild(btnLogin);
    registerLoginDiv.appendChild(divTmp);
}

function goBackAction()
{
    if(bodyID!="")
    {
        bodyID="";
        length=0;
        remove("figureInput");
        modelCreateAndSelect();
        clearPoprecni();
        clearComments();
        toggleCommenting();
        clearBuffer();
        drawGrid(false);
    }
}

function clearComments()
{
    document.getElementById("commentList").value="";
}

async function logOffAction()
{
    if(bodyID!="")
    {
            userID = "";
            userName = "";
            bodyID = "";
            length = 0;
            remove("registerLoginDiv");
            remove("figureInput");
            remove("tabSelector");
            clearPoprecni();
            clearBuffer();
            clearComments();
            toggleCommenting();
            registerLoginForm();
            drawGrid(false);
    }
    else
    {
        remove("registerLoginDiv");
        remove("tabSelector");
        remove("bodiesSelect");
        remove("newProjectDiv");
        registerLoginForm();
    }
}

function okNotification(message)
{
    notification.style.backgroundColor = "rgb(20, 150, 20)";
    notification.innerHTML = message;
    setTimeout(resetNotification, 2000);
}

function warningNotification(message)
{
    notification.style.backgroundColor = "rgb(180, 138, 32)";
    notification.innerHTML = message;
    setTimeout(resetNotification, 2000);
}

function errorNotification(message)
{
    notification.style.backgroundColor = "rgb(192, 64, 64)";
    notification.innerHTML = message;
    setTimeout(resetNotification, 2000);
}

function resetNotification()
{
    let notification = document.getElementById("notification");
    notification.style.backgroundColor = "rgb(90, 90, 95)";
    notification.innerHTML = "";
}

async function modelCreateAndSelect()
{
    let menu = document.getElementById("menuDiv");
    
    let tmp = document.createElement("div");
    tmp.className = "menuDiv";
    tmp.id = "bodiesSelect";
    menu.appendChild(tmp);

    let lbl = document.createElement("label");
    lbl.innerHTML = "Click on a project to open:"
    tmp.appendChild(lbl);
    
    let selectModel = document.createElement("div");
    selectModel.className = "bodiesDiv";
    selectModel.id = "bodiesDiv";
    tmp.appendChild(selectModel);

    await fetch("/getAllBodies")
        .then(response => response.json())
        .then(data => {
                data.forEach(item =>{
                        let bodyOption = document.createElement("button");
                        bodyOption.className = "bodyDiv";
                        fetch(`/getUserByID/${item.creatorID}`)
                        .then(response=>response.json())
                        .then(data=>{
                            let projectName = document.createElement("h3");
                            projectName.innerHTML=`${item.projectname}`;
                            projectName.style.margin=0;
                            projectName.style.padding=0;
                            bodyOption.appendChild(projectName);
                            let userName = document.createElement("label");
                            userName.innerHTML = `${data.username}`;
                            userName.style.margin=0;
                            userName.style.padding=0;
                            bodyOption.appendChild(userName);
                        })
                        bodyOption.onclick = async (ev) =>{

                            bodyID = item._id;
                            length = item.length;
                            figureInput(bodyID);
                            renderModel(bodyID);
                            socket.emit("openbody", bodyID);
                            item.comments.forEach(cmt=>
                                {
                                    document.getElementById("commentList").value+=cmt.user+" "+cmt.time+" "+cmt.content+"\n\n";
                                }
                            )
                            toggleCommenting();
                            remove("bodiesSelect");
                            remove("newProjectDiv");
                        };
                        selectModel.appendChild(bodyOption);
                })
            })
        .catch(error => {
            console.error('Error fetching data:', error);
    });

    tmp = document.createElement("div");
    tmp.className = "menuDiv";
    tmp.id = "newProjectDiv";
    menu.appendChild(tmp);

    
    lbl = document.createElement("label");
    lbl.innerHTML = "New project name:"
    tmp.appendChild(lbl);
    let bodyNameInput = document.createElement("input");
    bodyNameInput.id = "bodyName"
    tmp.appendChild(bodyNameInput);
    let createBodyBtn = document.createElement("button");
    createBodyBtn.innerHTML="Create project";
    createBodyBtn.onclick =async (ev) =>{

        var newBody = {
            projectname: document.getElementById("bodyName").value,
            creatorID: userID,
            length: 0
        }

        if(document.getElementById("bodyName").value!="")
        {
            await fetch("/createBody", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newBody),
            })
            .then(response => response.json())
            .then(data => {

                bodyID = data._id;

                remove("bodiesSelect");
                remove("newProjectDiv");
                
                if(document.getElementById("figureInput")==null)
                {
                    figureInput(data._id);
                    renderModel(data._id);
                    socket.emit("openbody",(data._id));
                }
                toggleCommenting();

            })
            .catch(error => {
                console.error("Error registering user:", error);
            });
        }
    };
    tmp.appendChild(createBodyBtn);
}

function figureInput(body)
{
    let figureInput = document.createElement("div");
    figureInput.className = "menuDiv";
    figureInput.id="figureInput";
    menu.appendChild(figureInput);

    let deleteBodyBtn = document.createElement("button");
    deleteBodyBtn.innerHTML="Delete project";
    deleteBodyBtn.onclick = async (ev) => {
        let bodyToDelete = 
        {
            id: body,
            userID: userID
        }
        await fetch("/deleteBody", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyToDelete),
        })
        .then(response => response.json())
        .then(data => {
            if(data.deletionSuccess=="true")
            {
                bodyID="";
                length=0;
                remove("figureInput");
                modelCreateAndSelect();
                clearPoprecni();
                clearComments();
                toggleCommenting();
                drawGrid(false);
            }
            if(data.deletionSuccess=="false")
            {
                errorNotification("Failed to delete project")
            }
        })
        .catch(error => {
            console.error("Error registering user:", error);
        });
    }
    figureInput.appendChild(deleteBodyBtn);

    var label = document.createElement("label");
    label.setAttribute("for", "shapes");
    label.textContent = "Select figure:";
    
    var select = document.createElement("select");
    select.id = "shapes";
    figureInput.appendChild(select);
    figureInput.appendChild(label);
    
    var option1 = document.createElement("option");
    option1.value = "triangle";
    option1.textContent = "Triangle";
    select.appendChild(option1);
    
    var option2 = document.createElement("option");
    option2.value = "trapezoid";
    option2.textContent = "Trapezoid";
    select.appendChild(option2);
    
    var option3 = document.createElement("option");
    option3.value = "rectangle";
    option3.textContent = "Rectangle";
    select.appendChild(option3);
    
    figureInput.appendChild(select);
    
    var aDiv = document.createElement("div");
    let aLabel = document.createElement("label");
    aLabel.innerHTML = "a: ";
    aDiv.appendChild(aLabel);
    
    var a = document.createElement("input");
    a.id = "aInput";
    a.placeholder = "cm";
    a.type = "number";
    aDiv.appendChild(a);
    a.onchange=(ev)=>{
        if(document.getElementById("poprecniPresek"))
    {
        clearPoprecni();
        drawShape(select.value,a.value,b.value,h.value,0);
    }
    }
    figureInput.appendChild(aDiv);
    
    var bDiv = document.createElement("div");
    let bLabel = document.createElement("label");
    bLabel.innerHTML = "b: ";
    bDiv.appendChild(bLabel);
    
    var b = document.createElement("input");
    b.id = "bInput";
    b.placeholder = "cm";
    b.type = "number";
    b.disabled = true;
    bDiv.appendChild(b);
    b.onchange=(ev)=>{
        if(document.getElementById("poprecniPresek"))
    {
        clearPoprecni();
        drawShape(select.value,a.value,b.value,h.value,0);
    }
    }
    figureInput.appendChild(bDiv);
    
    var hDiv = document.createElement("div");
    let hLabel = document.createElement("label");
    hLabel.innerHTML = "h: ";
    hDiv.appendChild(hLabel);
    
    var h = document.createElement("input");
    h.id = "hInput";
    h.placeholder = "cm";
    h.type = "number";
    hDiv.appendChild(h);
    h.onchange=(ev)=>{
        if(document.getElementById("poprecniPresek"))
    {
        clearPoprecni();
        drawShape(select.value,a.value,b.value,h.value,0);
    }
    }
    figureInput.appendChild(hDiv);

    let divTmp = document.createElement("div");

    let izvrnutaLbl = document.createElement("label");
    izvrnutaLbl.innerHTML = "Inverted:";
    divTmp.appendChild(izvrnutaLbl);
    let izvrnutaCheck = document.createElement("input");
    izvrnutaCheck.id="izvrnuta";
    izvrnutaCheck.className="stiklirano";
    izvrnutaCheck.type = "checkbox";
    divTmp.appendChild(izvrnutaCheck);

    figureInput.appendChild(divTmp);
    
    var aa,be,ha;
    let densityLbl = document.createElement("label");
    densityLbl.innerHTML = "Detail quality:";
    figureInput.appendChild(densityLbl);
    var range = document.createElement("input");
    range.id = "range";
    range.setAttribute("type","range");
    range.setAttribute("min",16);
    range.setAttribute("max",192);
    range.value=192;
    figureInput.appendChild(range);
    
    let pvLbl = document.createElement("h2");
    pvLbl.id = "PV";
    pvLbl.innerHTML = `P: ${P} V: ${V}`;
    figureInput.appendChild(pvLbl);

    divTmp = document.createElement("div");
    
    let btnAddFigure = document.createElement("button");
    btnAddFigure.innerHTML = "Insert figure";
    btnAddFigure.onclick = async (ev) => {

        let oblik = document.getElementById("shapes").value;
    
        if(oblik === "rectangle")
        {
            aa = document.getElementById("aInput").value;
            be = document.getElementById("bInput").value;
            ha = -1;
        }
    
        if(oblik === "triangle")
        {
            aa = document.getElementById("aInput").value;
            be = -1;
            ha = document.getElementById("hInput").value;
        }
    
        if(oblik === "trapezoid")
        {
            aa = document.getElementById("aInput").value;
            be = document.getElementById("bInput").value;
            ha = document.getElementById("hInput").value;
        }

        let inverted;
        if(document.getElementById("izvrnuta").checked == true)
        {
            inverted = true;
        }
        else
        {
            inverted = false;
        }

            var newFigure = {
                a:aa,
                b:be,
                h:ha,
                tip:oblik,
                izvrnuta:inverted
            }

            let telo = {
                a:aa,
                b:be,
                h:ha,
                tip:oblik,
                izvrnuta:inverted,
                bodyID:bodyID
            }

            if(length==8)
            {
                warningNotification("You can't add more than 8 figures to the body");
            }
            else
            {
                fetch(`/addFigure?id=${bodyID}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(newFigure),
                })
                .then(response => response.json())
                .then(data => {
                        renderModel(bodyID);
                        socket.emit("figureAdded",telo);
                    })
                .catch(error => {
                    console.error('Error fetching data:', error);
                });
            }
        };

    divTmp.appendChild(btnAddFigure);

    let btnDeleteTopFigure = document.createElement("button");
    btnDeleteTopFigure.innerHTML = "Delete top figure";
    btnDeleteTopFigure.onclick = async (ev) => {

        if(length==0)
        {
            warningNotification("You have no figure to delete");
        }
        else
        {
            fetch(`/deleteTopFigure?id=${bodyID}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                }
            })
                .then(response=>response.json())
                .then(data=>{
                            fetch(`/getBody?id=${bodyID}`, {
                                method: "GET",
                                headers: {
                                    "Content-Type": "application/json",
                                }
                            })
                            .then(response => response.json())
                            .then(data => {
                                    renderModel(bodyID);
                                    socket.emit("figureDeleted",bodyID);
                                })
                            .catch(error => {
                                console.error('Error fetching data:', error);
                            });
                        }
                    )
                }
            };

    divTmp.appendChild(btnDeleteTopFigure);

    figureInput.appendChild(divTmp);

    var select = document.getElementById("shapes");
    select.onchange = (ev) => {

    let izabrano = select.value;

    var a = document.getElementById("aInput");

    if (izabrano == "triangle") {
        b.disabled = true;
        b.value = '';
    } else {
        b.disabled = false;
    }
    if (izabrano == "rectangle") {
        h.disabled = true;
        h.value = '';
    } else {
        h.disabled = false;
    }
    if(document.getElementById("poprecniPresek"))
    {
        clearPoprecni();
        drawShape(izabrano,a.value,b.value,h.value,0);
    }
    };
}

function toggleCommenting()
{
    let komentar = document.getElementById("commentText");
    komentar.disabled = !komentar.disabled;
}

function commentSection()
{
    let userInteraction = document.createElement("div");
    userInteraction.className = "userInteraction";
    userInteraction.id = "userInteraction";
    host.appendChild(userInteraction);
    
    var btnKomentar = document.createElement("button");
    btnKomentar.innerHTML="Send";
    btnKomentar.onclick =async (ev) =>{
        let komentar = document.getElementById("commentText");

        if(bodyID=="")
        {
            errorNotification("Open a project to comment");
        }
        
        if(komentar.value!="" && bodyID!="")
            {
                let comment = {
                    user: userName,
                    content: komentar.value,
                    bodyID: bodyID
                }
        
                socket.emit("comment",comment);
                
                let sadrzaj = komentar.value;
                komentar.value="";
                komentar.focus();
                var newCmt = {
                    id: bodyID,
                    user: userName,
                    content: sadrzaj
                };
                fetch("/addComment", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(newCmt),
                })
                .then(response => response.json())
                .catch(error => {
                    console.error("Error registering user:", error);
                });
            }
    }
    userInteraction.appendChild(btnKomentar);
    
    var komentar = document.createElement("input");
    komentar.placeholder = "Type your comment here...";
    komentar.id = "commentText";
    komentar.disabled = true;
    userInteraction.appendChild(komentar);
    
    var commentList = document.createElement("textarea");
    commentList.id="commentList";
    commentList.readOnly = true;
    userInteraction.appendChild(commentList);    
}

function conePV(a,h)
{
    P += a*Math.PI*(a+Math.sqrt(a*a+h*h));
    V += (1/3)*(a*a*Math.PI*h);
}

function cylinderPV(a,b)
{
    P += 2*Math.PI*a*a+2*a*Math.PI*b;
    V += a*a*Math.PI*b;
}

function truncConePV(a,b,h)
{
    P += Math.PI*(a+b)*Math.sqrt((a-b)*(a-b)+h*h) + Math.PI*b*b + Math.PI*a*a;
    V += (1/3)*Math.PI*h*(b*b+a*b+a*a);
}

function roundToDecimalPlace(num, decimalPlaces)
{
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}

async function renderModel(projectID)
{
    let id = projectID;
    await fetch(`/getBody?id=${id}`)
        .then(response => response.json())
        .then(data => {
            let range_vrednost = 24;
            let cam_height = 0;
            let cam_distance = 0;
            let base_height = 0;
            let figureIndex = 0;

            P = 0;
            V = 0;
            document.getElementById("PV").innerHTML = `P: ${P} V: ${V}`;

            data.figures.forEach(f=>
                {
                    switch(f.tip)
                    {
                        case "triangle":
                            cam_height+=f.h;
                            cam_distance+=f.a;
                            conePV(f.a,f.h);
                            break;
                        case "rectangle":
                            cam_height+=f.b;
                            cam_distance+=f.a;
                            cylinderPV(f.a,f.b);
                            break;
                        case "trapezoid":
                            cam_height+=f.h;
                            if(f.a>f.b)
                            {
                                cam_distance+=f.a;
                            }
                            if(f.a<=f.b)
                            {
                                cam_distance+=f.b;
                            }
                            truncConePV(f.a,f.b,f.h);
                            break;
                    }
                })

            clearPoprecni();
            
            //sum of surface and volumes is shown
            P = roundToDecimalPlace(P, 4);
            V = roundToDecimalPlace(V, 4);
            document.getElementById("PV").innerHTML = `P: ${P} V: ${V}`;

            cam_height = cam_height/2;
            cam_distance = cam_distance/2;
            prevRadius = 0.0;
            data.figures.forEach(f=>{
            
            figureIndex++;
            
            vertexData=[];
            colorData=[];
            normalData=[];

            switch(f.tip)
            {
                case "triangle":
                    drawTruncatedCone(prevRadius,f.a,0.0,range_vrednost,cam_height,base_height,cam_distance);
                    vertexData=[];
                    colorData=[];
                    normalData=[];
                    drawCone(f.a,f.h,range_vrednost,cam_height,base_height,cam_distance);
                    drawShape("triangle",f.a,f.b,f.h,base_height*16);
                    base_height+=f.h;
                    prevRadius=0.0;
                    break;
                case "rectangle":
                    drawTruncatedCone(prevRadius,f.a,0.0,range_vrednost,cam_height,base_height,cam_distance);
                    vertexData=[];
                    colorData=[];
                    normalData=[];
                    drawCylinder(f.a,f.b,range_vrednost,cam_height,base_height,cam_distance);
                    drawShape("rectangle",f.a,f.b,f.h,base_height*16);
                    base_height+=f.b;
                    vertexData=[];
                    colorData=[];
                    normalData=[];
                    prevRadius=f.a;
                    if(figureIndex == data.length)
                    {
                        drawCircle(f.a,range_vrednost,1.0,cam_height,base_height,cam_distance);
                    }
                    break;
                case "trapezoid":
                    drawTruncatedCone(prevRadius,f.a,0.0,range_vrednost,cam_height,base_height,cam_distance);
                    vertexData=[];
                    colorData=[];
                    normalData=[];
                    drawTruncatedCone(f.a,f.b,f.h,range_vrednost,cam_height,base_height,cam_distance);
                    drawShape("trapezoid",f.a,f.b,f.h,base_height*16);
                    base_height+=f.h;
                    vertexData=[];
                    colorData=[];
                    normalData=[];
                    prevRadius=f.b;
                    if(figureIndex == data.length)
                    {
                        drawCircle(f.b,range_vrednost,1.0,cam_height,base_height,cam_distance);
                    }
                    break;
            }
            });

            let listaKomentara = document.getElementById("commentList");
            if(listaKomentara==null)
            {
                listaKomentara = document.getElementById("commentList");
                data.comments.forEach(cmt=>{
                        listaKomentara.value+=cmt.user+" "+cmt.time+" "+cmt.content+"\n\n";
                        listaKomentara.scrollTop = listaKomentara.scrollHeight;
                    });
            }
            })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

function drawShape(type,a,b,h,base2DHeight)
{
    var canvas = document.getElementById("poprecniPresek");
    var ctx = canvas.getContext("2d");
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.font = `${canvas.width/32}px Calibri`;
    let offset = 4;
    let density = 16;
    let factorWidth = canvas.width / density;
    let factorHeight = canvas.height / density;

    ctx.strokeStyle = "#ffff00";

    if (type === "triangle") 
    {
        // ctx.fillText(`a:${a} h:${h}`, canvas.width/20, canvas.height/20);

        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height - factorHeight - base2DHeight);
        ctx.lineTo(canvas.width/2 + a*density, canvas.height - factorHeight - base2DHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width/2 + a*density, canvas.height - factorHeight - base2DHeight);
        ctx.lineTo(canvas.width/2, canvas.height-factorHeight - h*density - base2DHeight);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height - factorHeight - h*density - base2DHeight);
        ctx.lineTo(canvas.width/2, canvas.height - factorHeight - base2DHeight);
        ctx.stroke();

        // ctx.font = `${canvas.width/24}px Calibri`;
        ctx.fillText(a, canvas.width/2 + a*density/2, canvas.height - factorHeight + 4*offset - base2DHeight);
        ctx.fillText(h, canvas.width/2 - 4*offset, canvas.height-factorHeight - h*density/2 - base2DHeight);
    }
    else if (type === "trapezoid") 
    {
        // ctx.fillText(`a:${a} b:${b} h:${h}`, canvas.width/20, canvas.height/20);
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, canvas.height-factorHeight - base2DHeight);
        ctx.lineTo(canvas.width/2+a*density, canvas.height-factorHeight - base2DHeight);
        ctx.lineTo(canvas.width/2+b*density, canvas.height-factorHeight-h*density - base2DHeight);
        ctx.lineTo(canvas.width/2, canvas.height-factorHeight-h*density - base2DHeight);
        ctx.closePath();
        ctx.stroke();
        // ctx.font = `${canvas.width/24}px Calibri`;
        ctx.fillText(a, canvas.width/2 + a*density/2, canvas.height - factorHeight + 4*offset - base2DHeight);
        ctx.fillText(b, canvas.width/2 + b*density/2, canvas.height - factorHeight - h*density + 4*offset - base2DHeight);
        ctx.fillText(h, canvas.width/2 - 4*offset, canvas.height-factorHeight - h*density/2 - base2DHeight);
    }
    else if (type === "rectangle") 
    {
        // ctx.fillText(`a:${a} b:${b}`, canvas.width/20, canvas.height/20);
        ctx.strokeRect(canvas.width/2, canvas.height - factorHeight - base2DHeight, a*density, -b*density );
        // ctx.font = `${canvas.width/24}px Calibri`;
        ctx.fillText(a, canvas.width/2 + a*density/2, canvas.height - factorHeight + 4*offset - base2DHeight);
        ctx.fillText(b, canvas.width/2 - 4*offset, canvas.height-factorHeight - b*density/2 - base2DHeight);
    }
}

function modelColor()
{
    return [0.6,0.6,0.6];
}

function drawGrid(rotating)
{
    vertexData= [
        //koordinatne ose
        1.0, 0.0, 0.0,
        0.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 0.0
    ];
    
    colorData = [
        //boje x,y,z ose
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
    ];

    normalData = [
        //vektor normale
        0.0,1.0,0.0,
        0.0,1.0,0.0,
        0.0,1.0,0.0,
        0.0,1.0,0.0,
        0.0,1.0,0.0,
        0.0,1.0,0.0,
    ];

    let density = 8;
    let size = 4.0;
    let factor = size/density;
    
    for (i = 0; i <= density*2; i++)
        {
            gridVertex1 = [size,-0.01,-size+factor*i];
            gridVertex2 = [-size,-0.01,-size+factor*i];
            vertexData.push(...gridVertex1);
            vertexData.push(...gridVertex2);
            gridColor = [0.6,0.6,0.6];
            colorData.push(...gridColor);
            colorData.push(...gridColor);
            normalData.push(...[0.0,1.0,0.0]);
            normalData.push(...[0.0,1.0,0.0]);
            gridVertex3 = [size-factor*i,-0.01,size];
            gridVertex4 = [size-factor*i,-0.01,-size];
            vertexData.push(...gridVertex3);
            vertexData.push(...gridVertex4);
            colorData.push(...gridColor);
            colorData.push(...gridColor);
            normalData.push(...[0.0,1.0,0.0]);
            normalData.push(...[0.0,1.0,0.0]);
        }
    webgl(gl.LINES,rotating,1.0+zoom/8,1.0+zoom,gl.BACK,angleX,angleY);
}

function drawCircle(r,dense,normalDir,camheight,height,cam_distance)
{
    let density = dense;
    let size = r;
    let theta = (Math.PI*2)/density;
    let cosine = Math.cos(theta);
    let sine = Math.sin(theta);

    circleCenter = [0.0,height,0.0];
    vertexData.push(...circleCenter);
    colorData.push(...modelColor());
    normalData.push(...[0.0,normalDir,0.0]);

    circleVertex = [size,height,0.0];
    vertexData.push(...circleVertex);
    colorData.push(...modelColor());
    normalData.push(...[0.0,normalDir,0.0]);
    for(i=0;i<density;i++)
    {
        circleVertex = [cosine*circleVertex[0]+sine*circleVertex[2],height,-sine*circleVertex[0]+cosine*circleVertex[2]];
        vertexData.push(...circleVertex);
        vertexData.push(...circleVertex);
        colorData.push(...modelColor());
        colorData.push(...modelColor());
        normalData.push(...[0.0,normalDir,0.0]);
        normalData.push(...[0.0,normalDir,0.0]);
    }
    webgl(gl.TRIANGLE_FAN,false,camheight+zoom/8,cam_distance+zoom,gl.BACK,angleX,angleY);
}

function drawCone(a,h,dense,cam_height,base_height,cam_distance)
{
    if(a==0 || h==0)
    {
        warningNotification("nepopunjene dimenzije");
    }
    else
    {
        
        let density = dense;
        let size = a;
        
        let theta = (Math.PI*2)/density;
        let cosine = Math.cos(theta);
        let sine = Math.sin(theta);
        circleVertex = [size,base_height,0.0];

        for(i=0;i<=density;i++)
        {
            coneTipVertex = [0.0,h+base_height,0.0];
            vertexData.push(...coneTipVertex);
            colorData.push(...modelColor());
            
            vertexData.push(...circleVertex);
            colorData.push(...modelColor());

            vector1=[circleVertex[0]-coneTipVertex[0],circleVertex[1]-coneTipVertex[1],circleVertex[2]-coneTipVertex[2]];

            circleVertexOld = circleVertex;

            circleVertex = [cosine*circleVertex[0]+sine*circleVertex[2],base_height,-sine*circleVertex[0]+cosine*circleVertex[2]];
            vertexData.push(...circleVertex);
            colorData.push(...modelColor());

            vector2 = [circleVertex[0]-circleVertexOld[0],circleVertex[1]-circleVertexOld[1],circleVertex[2]-circleVertexOld[2]];
            
            // U-vector1, V-vector2
            // Nx = UyVz - UzVy
            // Ny = UzVx - UxVz
            // Nz = UxVy - UyVx
            normalVector = [vector1[1]*vector2[2]-vector1[2]*vector2[1],
            vector1[2]*vector2[0]-vector1[0]*vector2[2],
            vector1[0]*vector2[1]-vector1[1]*vector2[0]];
            let normalMagnitude = Math.sqrt(normalVector[0]*normalVector[0]+normalVector[1]*normalVector[1]+normalVector[2]*normalVector[2]);
            normalVector = [normalVector[0]/normalMagnitude,normalVector[1]/normalMagnitude,normalVector[2]/normalMagnitude];

            normalData.push(...normalVector);
            normalData.push(...normalVector);
            normalData.push(...normalVector);

        }
        webgl(gl.TRIANGLES,false,cam_height+zoom/8,cam_distance+zoom,gl.BACK,angleX,angleY);
    }
        
}

function drawCylinder(a,b,dense,cam_height,base_height,cam_distance)
{
    if(a==0 || b==0)
    {
        warningNotification("nepopunjene dimenzije");
    }
    else
    {
        let theta = (Math.PI*2)/dense;
        let cosine = Math.cos(theta);
        let sine = Math.sin(theta);

        let radius = a;
        let height = b;

        for(i=0;i<=dense;i++)
        {
            if(i==0)
            {
                //prvo teme trouglica
                wrapVertexTop = [radius,height+base_height,0.0];
                vertexData.push(...wrapVertexTop);
                colorData.push(...modelColor());
        
                //drugo teme trouglica
                wrapVertexBottom = [radius,base_height,0.0];
                vertexData.push(...wrapVertexBottom);
                colorData.push(...modelColor());
            }
            else
            {
                vertexData.push(...wrapVertexTop);
                colorData.push(...modelColor());
                vertexData.push(...wrapVertexBottom);
                colorData.push(...modelColor());
            }

            //prvi vektor za cross product: U = p2-p1
            vector1=[wrapVertexBottom[0]-wrapVertexTop[0],wrapVertexBottom[1]-wrapVertexTop[1],wrapVertexBottom[2]-wrapVertexTop[2]];
        
            wrapVertexTopOld = wrapVertexTop;

            //trece teme trouglica
            wrapVertexTop = [cosine*wrapVertexTop[0]+sine*wrapVertexTop[2],height+base_height,-sine*wrapVertexTop[0]+cosine*wrapVertexTop[2]];
            vertexData.push(...wrapVertexTop);
            colorData.push(...modelColor());

            //drugi vektor za cross product: V = p3-p1
            vector2 = [wrapVertexTop[0]-wrapVertexTopOld[0],wrapVertexTop[1]-wrapVertexTopOld[1],wrapVertexTop[2]-wrapVertexTopOld[2]];

            // U-vector1, V-vector2
            // Nx = UyVz - UzVy
            // Ny = UzVx - UxVz
            // Nz = UxVy - UyVx
            normalVector = [vector1[1]*vector2[2]-vector1[2]*vector2[1],
            vector1[2]*vector2[0]-vector1[0]*vector2[2],
            vector1[0]*vector2[1]-vector1[1]*vector2[0]];
            let normalMagnitude = Math.sqrt(normalVector[0]*normalVector[0]+normalVector[1]*normalVector[1]+normalVector[2]*normalVector[2]);
            normalVector = [normalVector[0]/normalMagnitude,normalVector[1]/normalMagnitude,normalVector[2]/normalMagnitude];
            
            //provera da li su normalni vektori jedinicni
            // normalMagnitude = Math.sqrt(normalVector[0]*normalVector[0]+normalVector[1]*normalVector[1]+normalVector[2]*normalVector[2]);
            // console.log(normalMagnitude);

            //cetiri normale jer pushujemo 4 vertexa po ciklusu petlje
            normalData.push(...normalVector);
            normalData.push(...normalVector);
            normalData.push(...normalVector);
            normalData.push(...normalVector);
            
            wrapVertexBottom = [cosine*wrapVertexBottom[0]+sine*wrapVertexBottom[2],base_height,-sine*wrapVertexBottom[0]+cosine*wrapVertexBottom[2]];
            vertexData.push(...wrapVertexBottom);
            colorData.push(...modelColor());
        }
        webgl(gl.TRIANGLE_STRIP,false,cam_height+zoom/8,cam_distance+zoom,gl.BACK,angleX,angleY);
    }
}

function drawTruncatedCone(a,b,h,dense,cam_height,base_height,cam_distance)
{
        let theta = (Math.PI*2)/dense;
        let cosine = Math.cos(theta);
        let sine = Math.sin(theta);

        let outer = a;
        let inner = b;
        let height = h;

        for(i=0;i<dense;i++)
        {
            if(i==0)
            {
                wrapVertexInner = [inner,height+base_height,0.0];
                wrapVertexOuter = [outer,base_height,0.0];
                vertexData.push(...wrapVertexInner);
                vertexData.push(...wrapVertexOuter);
                colorData.push(...modelColor());
                colorData.push(...modelColor());
            }
            else
            {
                vertexData.push(...wrapVertexInner);
                vertexData.push(...wrapVertexOuter);
                colorData.push(...modelColor());
                colorData.push(...modelColor());
            }

            vector1=[wrapVertexOuter[0]-wrapVertexInner[0],wrapVertexOuter[1]-wrapVertexInner[1],wrapVertexOuter[2]-wrapVertexInner[2]];

            wrapVertexInnerOld = wrapVertexInner;

            wrapVertexInner = [cosine*wrapVertexInner[0]+sine*wrapVertexInner[2],height+base_height,-sine*wrapVertexInner[0]+cosine*wrapVertexInner[2]];
            vertexData.push(...wrapVertexInner);
            colorData.push(...modelColor());

            vector2 = [wrapVertexInner[0]-wrapVertexInnerOld[0],wrapVertexInner[1]-wrapVertexInnerOld[1],wrapVertexInner[2]-wrapVertexInnerOld[2]];

            // U-vector1, V-vector2
            // Nx = UyVz - UzVy
            // Ny = UzVx - UxVz
            // Nz = UxVy - UyVx
            normalVector = [vector1[1]*vector2[2]-vector1[2]*vector2[1],
            vector1[2]*vector2[0]-vector1[0]*vector2[2],
            vector1[0]*vector2[1]-vector1[1]*vector2[0]];
            let normalMagnitude = Math.sqrt(normalVector[0]*normalVector[0]+normalVector[1]*normalVector[1]+normalVector[2]*normalVector[2]);
            normalVector = [normalVector[0]/normalMagnitude,normalVector[1]/normalMagnitude,normalVector[2]/normalMagnitude];

            normalData.push(...normalVector);
            normalData.push(...normalVector);
            normalData.push(...normalVector);
            normalData.push(...normalVector);

            wrapVertexOuter = [cosine*wrapVertexOuter[0]+sine*wrapVertexOuter[2],base_height,-sine*wrapVertexOuter[0]+cosine*wrapVertexOuter[2]];
            vertexData.push(...wrapVertexOuter);
            colorData.push(...modelColor());
        }
        webgl(gl.TRIANGLE_STRIP,false,cam_height+zoom/8,cam_distance+zoom,gl.BACK,angleX,angleY);
}

function webgl(glDrawMode, animacija, height, distance, cullDirection, rotateY, rotateX)
{
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        throw new Error (`Could not compile WebGL program. \n\n${info}`);
    }

    resizeCanvasToDisplaySize(canvas);

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const positionLocation = gl.getAttribLocation(program, `position`);
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    const normalLocation = gl.getAttribLocation(program, `normal`);
    gl.enableVertexAttribArray(normalLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

    const colorLocation = gl.getAttribLocation(program, `color`);
    gl.enableVertexAttribArray(colorLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(cullDirection);

    const uniformLocations = {
        matrix: gl.getUniformLocation(program,`matrix`),
        normalMatrix: gl.getUniformLocation(program, `normalMatrix`),
    };

    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix,
        75*Math.PI/180,
        canvas.clientWidth/canvas.clientHeight,
        1e-4,
        1e2);

    const mvMatrix =mat4.create();
    const mvpMatrix = mat4.create();


    mat4.rotateY(modelMatrix, modelMatrix, rotateY);
    mat4.rotateX(modelMatrix, modelMatrix, rotateX);
    mat4.translate(viewMatrix,viewMatrix,[0.0,0.0+height,4.0+distance]);
    mat4.invert(viewMatrix,viewMatrix);

    const normalMatrix = mat4.create();

    function animate() {

        mat4.rotateY(modelMatrix, modelMatrix, Math.PI/200);
        mat4.multiply(mvMatrix,viewMatrix,modelMatrix);
        mat4.multiply(mvpMatrix,projectionMatrix,mvMatrix);
        
        mat4.invert(normalMatrix, mvMatrix);
        mat4.transpose(normalMatrix, normalMatrix);
        gl.uniformMatrix4fv(uniformLocations.normalMatrix, false, normalMatrix);
        gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);
        
        gl.drawArrays(glDrawMode, 0, vertexData.length/3);
        
        requestAnimationFrame(animate);
    }

    if(!animacija)
    {
        mat4.multiply(mvMatrix,viewMatrix,modelMatrix);
        mat4.multiply(mvpMatrix,projectionMatrix,mvMatrix);

        mat4.invert(normalMatrix, mvMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv(uniformLocations.normalMatrix, false, normalMatrix);
        gl.uniformMatrix4fv(uniformLocations.matrix, false, mvpMatrix);

        gl.drawArrays(glDrawMode, 0, vertexData.length/3);
    }
    else
    {
        animate();
    }
}

function clearBuffer()
{
    gl.clearColor(0.612, 0.929, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
}
