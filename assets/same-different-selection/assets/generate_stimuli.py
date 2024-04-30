from PIL import Image, ImageDraw


def draw_circle(draw, center, radius, color):
    x, y = center
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=color)

def draw_square(draw, center, size, color):
    x, y = center
    half_size = size // 2
    draw.rectangle([x - half_size, y - half_size, x + half_size, y + half_size], fill=color)

def draw_triangle(draw, center, size, color):
    x, y = center
    height = size * (3**0.5 / 2)
    top_point = (x, y - height // 2)
    left_point = (x - size // 2, y + height // 2)
    right_point = (x + size // 2, y + height // 2)
    draw.polygon([top_point, left_point, right_point], fill=color)

def draw_shape(draw, shape, center, size, color):
    if shape == 'circle':
        draw_circle(draw, center, size // 2, color)
    elif shape == 'square':
        draw_square(draw, center, size, color)
    elif shape == 'triangle':
        draw_triangle(draw, center, size, color)

def save_shape(shape, size, color, cardinality):
    # Size mapping
    size_mapping = {35: 'sm', 70: 'med', 105: 'lg'}
    word_size = size_mapping[size]  # Convert size to word label

    canvas_size = 220
    image = Image.new("RGB", (canvas_size, canvas_size), "white")
    draw = ImageDraw.Draw(image)

    if cardinality in [2, 3]: # size != 150 and
        # Adjust centers to ensure no overlap
        if cardinality == 2:
            centers = [(canvas_size // 2, canvas_size // 4), (canvas_size // 2, 3 * canvas_size // 4)]
            for center in centers:
                draw_shape(draw, shape, center, size, color)
        else:
            centers = [
                (canvas_size // 2, canvas_size // 4),
                (canvas_size // 4, 3 * canvas_size // 4),
                (3 * canvas_size // 4, 3 * canvas_size // 4)
            ]
            for center in centers:
                draw_shape(draw, shape, center, size, color)
        filename = f"{word_size}-{color}-{shape}-{cardinality}.jpg"
    else:
        center = (canvas_size // 2, canvas_size // 2)
        if shape == 'circle':
            draw_circle(draw, center, size // 2, color)
        elif shape == 'square':
            draw_square(draw, center, size, color)
        elif shape == 'triangle':
            draw_triangle(draw, center, size, color)
        filename = f"{word_size}-{color}-{shape}.jpg"
    image.save(filename)

shapes = ['circle', 'square', 'triangle']
sizes = [35, 70, 105]
colors = ['red', 'green', 'blue']
cardinalities = [1, 2, 3]

for shape in shapes:
    for size in sizes:
        for color in colors:
            for cardinality in cardinalities:
                save_shape(shape, size, color, cardinality)
