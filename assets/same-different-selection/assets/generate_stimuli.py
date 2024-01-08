from PIL import Image, ImageDraw

def draw_circle(draw, size, color, canvas_size):
    radius = size // 2
    left_up_point = (canvas_size - size) // 2
    right_down_point = left_up_point + size
    draw.ellipse([left_up_point, left_up_point, right_down_point, right_down_point], fill=color)

def draw_square(draw, size, color, canvas_size):
    left_up_point = (canvas_size - size) // 2
    right_down_point = left_up_point + size
    draw.rectangle([left_up_point, left_up_point, right_down_point, right_down_point], fill=color)

def draw_triangle(draw, size, color, canvas_size):
    height = size * (3**0.5 / 2)
    top_point = (canvas_size // 2, (canvas_size - height) // 2)
    left_point = ((canvas_size - size) // 2, (canvas_size + height) // 2)
    right_point = ((canvas_size + size) // 2, (canvas_size + height) // 2)
    draw.polygon([top_point, left_point, right_point], fill=color)

def save_shape(shape, size, color):
    canvas_size = 200
    image = Image.new("RGB", (canvas_size, canvas_size), "white")
    draw = ImageDraw.Draw(image)

    if shape == 'circle':
        draw_circle(draw, size, color, canvas_size)
    elif shape == 'square':
        draw_square(draw, size, color, canvas_size)
    elif shape == 'triangle':
        draw_triangle(draw, size, color, canvas_size)

    filename = f"{shape}-{color}-{size}.jpg"
    image.save(filename)

shapes = ['circle', 'square', 'triangle']
sizes = [50, 100, 150]
colors = ['red', 'green', 'blue']

for shape in shapes:
    for size in sizes:
        for color in colors:
            save_shape(shape, size, color)