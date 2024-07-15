from PIL import Image, ImageDraw, ImageChops


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


def apply_texture(draw, mask, texture):
    if texture == 'lines':
        add_lines(draw, mask)
    elif texture == 'polka_dots':
        add_polka_dots(draw, mask)


def add_lines(draw, mask):
    for y in range(0, mask.height, 5):
        draw.line((0, y, mask.width, y), fill='black', width=3)


def add_polka_dots(draw, mask):
    dot_radius = 2
    step = 5
    for y in range(0, mask.height, step):
        for x in range(0, mask.width, step):
            if mask.getpixel((x, y)) == 255:
                draw.ellipse([x - dot_radius, y - dot_radius, x + dot_radius, y + dot_radius], fill='black')


def draw_shape(draw, shape, center, size, color, texture):
    mask = Image.new('L', draw.im.size, 0)
    mask_draw = ImageDraw.Draw(mask)

    if shape == 'circle':
        draw_circle(mask_draw, center, size // 2, 255)
        draw_circle(draw, center, size // 2, color)
    elif shape == 'square':
        draw_square(mask_draw, center, size, 255)
        draw_square(draw, center, size, color)
    elif shape == 'triangle':
        draw_triangle(mask_draw, center, size, 255)
        draw_triangle(draw, center, size, color)

    if texture != 'none':
        texture_mask = ImageChops.multiply(mask, mask)
        apply_texture(ImageDraw.Draw(texture_mask), texture_mask, texture)
        draw.bitmap((0, 0), texture_mask, fill=None)


def save_shape(shape, size, color, cardinality, background_color, texture):
    # Size mapping
    size_mapping = {35: 'sm', 70: 'med', 105: 'lg'}
    word_size = size_mapping[size]  # Convert size to word label
    color_mapping = {'red': '#D81B60', 'green': '#004D40', 'blue': '#1E88E5'}  # color-blind friendly
    hex_color = color_mapping[color]

    canvas_size = 220
    image = Image.new("RGB", (canvas_size, canvas_size), background_color)
    draw = ImageDraw.Draw(image)

    if cardinality in [2, 3]:
        # Adjust centers to ensure no overlap
        if cardinality == 2:
            centers = [(canvas_size // 2, canvas_size // 4), (canvas_size // 2, 3 * canvas_size // 4)]
            for center in centers:
                draw_shape(draw, shape, center, size, hex_color, texture)
        else:
            centers = [
                (canvas_size // 2, canvas_size // 4),
                (canvas_size // 4, 3 * canvas_size // 4),
                (3 * canvas_size // 4, 3 * canvas_size // 4)
            ]
            for center in centers:
                draw_shape(draw, shape, center, size, hex_color, texture)
        filename = f"{word_size}-{color}-{shape}-{cardinality}-{background_color}-{texture}.webp"
    else:
        center = (canvas_size // 2, canvas_size // 2)
        draw_shape(draw, shape, center, size, hex_color, texture)
        filename = f"{word_size}-{color}-{shape}-{background_color}-{texture}.webp"
    image.save(filename, "WEBP")


shapes = ['circle', 'square', 'triangle']
sizes = [35, 70, 105]
colors = ['red', 'green', 'blue']
cardinalities = [1, 2, 3]
background_colors = ['white', 'black', 'gray']
textures = ['none', 'lines', 'polka_dots']

for shape in shapes:
    for size in sizes:
        for color in colors:
            for cardinality in cardinalities:
                for background_color in background_colors:
                    for texture in textures:
                        save_shape(shape, size, color, cardinality, background_color, texture)