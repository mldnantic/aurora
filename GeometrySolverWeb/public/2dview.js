function drawPoprecni()
{
    let poprecni = document.createElement("canvas");
    poprecni.className="poprecniPresek";
    poprecni.id="poprecniPresek";
    glavniDiv.appendChild(poprecni);

    let height = poprecni.offsetHeight;
    let width = poprecni.offsetWidth/2;
    poprecni.width = width*window.devicePixelRatio;
    poprecni.height = height*window.devicePixelRatio;
}

function clearPoprecni()
{
    let platno2D = document.getElementById("poprecniPresek");
    let ctx = platno2D.getContext("2d");
    ctx.clearRect(0, 0, platno2D.width, platno2D.height);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#555555";
    ctx.font = `${platno2D.width/32}px Calibri`;
    let offset = 4;
    let density = 16;
    let factorWidth = platno2D.width / density;
    let factorHeight = platno2D.height / density;

    for (i = 0; i < density; i++)
    {
        ctx.beginPath();
        ctx.moveTo(platno2D.width/density+factorWidth*i,platno2D.height/density);
        ctx.lineTo(platno2D.width/density+factorWidth*i,(density-1)*platno2D.height/density);
        ctx.stroke();
    }

    for (i = 0; i < density-1; i++)
    {
        ctx.beginPath();
        ctx.moveTo(platno2D.width/density,platno2D.height/density+factorHeight*i);
        ctx.lineTo((density-1)*platno2D.width/density,platno2D.height/density+factorHeight*i);
        ctx.stroke();
    }

    ctx.strokeStyle = "#00ff00";
    ctx.beginPath();
    ctx.moveTo(platno2D.width/2, platno2D.height / density);
    ctx.lineTo(platno2D.width/2, platno2D.height-factorHeight);
    ctx.stroke();
    ctx.fillText("Y", platno2D.width/2, platno2D.height / density - offset);

    ctx.strokeStyle = "#ff0000";
    ctx.beginPath();
    ctx.moveTo(platno2D.width/2, platno2D.height-factorHeight);
    ctx.lineTo(platno2D.width-factorWidth, platno2D.height-factorHeight);
    ctx.stroke();
    ctx.fillText("X", platno2D.width-factorWidth + offset, platno2D.height-factorHeight);
}