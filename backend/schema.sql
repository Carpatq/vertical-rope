-- ============================================================
-- Vertical Rope - Esquema de base de datos
-- Compatible con MariaDB (XAMPP) y MySQL 5.7+/8
-- Nota: por pedido de la empresa NO existe ninguna columna de precio.
-- ============================================================

CREATE DATABASE IF NOT EXISTS vertical_rope
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vertical_rope;

-- Líneas de producto: Arborismo, Protección Personal, Rescate y Emergencias, etc.
CREATE TABLE IF NOT EXISTS lineas (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(120) NOT NULL,
  slug    VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_lineas_slug (slug)
) ENGINE=InnoDB;

-- Categorías por tipo: Arnés, Conectores, Poleas, etc.
CREATE TABLE IF NOT EXISTS categorias (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(120) NOT NULL,
  slug    VARCHAR(120) NOT NULL,
  UNIQUE KEY uq_categorias_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku               VARCHAR(60)  NULL,
  nombre            VARCHAR(255) NOT NULL,
  slug              VARCHAR(190) NOT NULL,
  descripcion_corta TEXT         NULL,
  descripcion       MEDIUMTEXT   NULL,
  imagen            VARCHAR(255) NULL,          -- nombre del archivo en /imagenes
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_productos_slug (slug),
  KEY idx_productos_sku (sku),
  KEY idx_productos_activo (activo),
  FULLTEXT KEY ft_productos_busqueda (nombre, descripcion_corta)
) ENGINE=InnoDB;

-- Un producto puede estar en varias líneas y varias categorías
CREATE TABLE IF NOT EXISTS producto_linea (
  producto_id INT UNSIGNED NOT NULL,
  linea_id    INT UNSIGNED NOT NULL,
  PRIMARY KEY (producto_id, linea_id),
  KEY idx_pl_linea (linea_id),
  CONSTRAINT fk_pl_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_pl_linea    FOREIGN KEY (linea_id)    REFERENCES lineas(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS producto_categoria (
  producto_id  INT UNSIGNED NOT NULL,
  categoria_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (producto_id, categoria_id),
  KEY idx_pc_categoria (categoria_id),
  CONSTRAINT fk_pc_producto  FOREIGN KEY (producto_id)  REFERENCES productos(id)  ON DELETE CASCADE,
  CONSTRAINT fk_pc_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
) ENGINE=InnoDB;
