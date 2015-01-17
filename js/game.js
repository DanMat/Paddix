/*
Creator: Dragon Prince
Date: 25.09.2011
Time: 12.02 PM
*/
var prince= {};
prince.score=$("#score");
prince.box=$("#box");//The game play is sealed within the box
//we seal all de other components inside de box
prince.counter=$('<div id="counter" />').appendTo(prince.score);
prince.plane=$('<div id="plane" />').appendTo(prince.box);
prince.paddle=$('<div id="paddle" />').appendTo(prince.plane);//the paddle must be inside the plane
prince.ball=$('<div id="ball" />').appendTo(prince.box);
prince.brick=$('<div id="brick" />').appendTo(prince.box);

var k= { leftDown: !1, rightDown: !1, upDown:!1, downDown:!1 };//check which key is pressed
var width= prince.box.width();//calculates the width of de box
var height= prince.box.height();//calculates the height of the box
var brick_width= Math.floor(width/18);
var brick_height = Math.floor(height / (18) * 0.3);
var g=0;
var o = 0.25 * width;
		
brick_paddle();//function to create the bricks and paddle	
s();//to control the speed of the ball

function brick_paddle()
{
prince.brick.empty();//intialize to zero at first
prince.ball.empty();//intialize to zero at first
prince.counter.text("");//initialize
i=[];
c=null;
//constructing the bricks
for (var a=0; a<brick_height; a++)
for (var b=0; b<brick_width; b++)
{
var f =$('<input type="'+(Math.random()>0.5 ? "radio" : "checkbox")+'"checked>').appendTo(prince.brick);

//use css to place de bricks
f.css({
position: "absolute",
left:3+b*(18),
top:3+a*(18)
});
i.push(new y(f));//we assign the brick values to the array i
}
temp=width;
navigator.appVersion.match(/Mac/gi) ? temp += 28 : navigator.appVersion.match(/Win/gi) && (temp += 40, prince.plane.css("left", -20));//we do some basic tweaks to the width of the game based on the browser used
prince.plane.width(temp);
prince.paddle.width(1/0.25*width);//width of the paddle
$('<input type="radio" checked>').appendTo(prince.ball);//we create the ball here
c= new z(prince.ball);//the ball position
c.move(width*0.2 + Math.random()*width*0.6 , height-50);//sets the initial position of the ball. First parameter is for the y axis, second parameter for y axis

window.addEventListener("keydown", A, !1);
window.addEventListener("keyup", B, !1);
window.addEventListener("mousemove", C, !1);
u();
}

function s()
{
c.velocity.y=-5;
c.velocity.x=Math.random() > 0.5? -4:4;
}

function y(a, b, c) //we pass the position. left and top values of the brick
{
//basic initialization
this.element= a;
this.velocity= { x: b , y: c};
this.rotation=0;
this.previousPosition= { x: this.element.position().left,
				 y: this.element.position().top
				};
this.falling= false;//if true makes de bricks penetrable
this.step= function() //set the moment and speed when the bricks fall down
{
var a= this.position().x + this.velocity.x;
var b= this.position().y + this.velocity.y;
this.element.css({//makes sure de brick falls down
left: a,
top: b
});
//falling speed initialization
this.velocity.x *= 0.98;
this.velocity.y *= 1.02;
//position while falling
this.previousPosition= { x:a , y:b };
};
this.fall = function () 
{
this.falling= true;
this.element.removeAttr("checked");
//ensures a smooth fallinf down curve
this.velocity.x=-2 + Math.random()*4;
this.velocity.y= 2 + Math.random()*4;
};
this.position= function() //maintains the newsfeed of movement
{
return this.previousPosition;
}
}
  
function z(a, b, c)//regulates the movement of the ball
{
this.element= a;
this.velocity= { x:b , y:c };
this.step= function ()//defines the movement of the ball 
{
this.move(this.element.position().left + this.velocity.x,
		  this.element.position().top + this.velocity.y);
};
this.move= function(a, b)//we pass the moment which is printed here
{
this.element.css({
left: a,
top: b
})
};
this.position = function () 
{
return {
        x: this.element.position().left,
        y: this.element.position().top
       } 
}
}

function A(a)
{
switch (a.keyCode)
{
case 37:
k.leftDown= true;
a.preventDefault();
break;


case 39:
k.rightDown= true;
a.preventDefault();
break;

}
}

function B(a)
{
switch (a.keyCode)
{
case 37:
k.leftDown= false;
a.preventDefault();
break;

case 39:
k.rightDown= false;
a.preventDefault();
break;
}
}

function C(a) 
{
g = Math.max(Math.min((a.clientX - prince.box.offset().left) / width, 1), 0)
}


function u()
{
var a= c.position();//ball position
if(a.x<0)//creates the left wall
c.velocity.x= Math.abs(c.velocity.x);//It changes the negative value of c.velocity.x to positive in other words it changes the dimension

else if(a.x+14>width)//creates the right wall
c.velocity.x= -Math.abs(c.velocity.x);

if(a.y<0)//creates top wall
c.velocity.y= Math.abs(c.velocity.y);

else if(a.y>height-35)//go to the base plan
if(a.y<height)
{
var d= Math.max(Math.min(g*width-o/2,width-o),0);//co ordinate where the ball hits the paddle
f=d+o;

if(a.x+14 >= d && a.x<= f)//find the paddle n make it a solid
{
c.velocity.x = 10 * ((a.x - d) / (f - d) - 0.5); //makes the ball to change direction based on the area where it hits the paddle
c.velocity.y = -Math.abs(c.velocity.y); 
c.step();//updating newsfeed
}
}
else//restart the game
{
brick_paddle();
s();
return
}

c.step();//the function z is passed to c initially.. the step() is inside function z
d = i.length;//total nos of bricks
f=!1;

for(v=0; d--;)
{
var p= i[d];//position,left,top and the functions of y() is passed for brick
var h=p.position();

//check if a brick is falling
p.falling ? (p.step(), h.y > height && i.splice (d,1)): 
((a.x+14>h.x) && (a.x<h.x+15) && (a.y+14>h.y) && (a.y<h.y+15))? (f=!0, p.fall(), c.velocity.x= (a.x<h.x+15*0.5 ? -Math.abs(c.velocity.x) : Math.abs(c.velocity.x)), c.velocity.y= (a.y<h.y+15*0.5? -Math.abs(c.velocity.y) : Math.abs(c.velocity.y))) :v++;

/*
if the dth brick is hit
p.step() activates brick fall sequence
i.splice removes tat brick from the array

if the dth brick is not hit 
Check if the ball hits any other brick

if it does
activate the fall() inside the y function
regulate the balls motion
*/

}
//display counter
f && (prince.counter.stop(!0, !0).fadeTo(50, 0.4).fadeTo(900, 0.1), prince.counter.text(v));
//counter function, create the fade effect and displays the blocks lift
i.length === 0 ? (alert("How the bleedy hell did u win!!"), brick_paddle(), s()) : (prince.plane.scrollLeft(g * prince.paddle.width() - o * 2), setTimeout(u, 16))
/*
If bricks are zero run the message box and start the new game
or
keep continuing the u() till the condition is satisfied
*/
}

