На основе структуры экспорта/импорта JSON и типов данных, вот DDL для PostgreSQL:

-- ============================================================
-- LuminaBooks Database Schema for PostgreSQL
-- ============================================================

-- Enum для статусов книг
CREATE TYPE book_status AS ENUM (
    'READING',
    'READ',
    'WANT_TO_READ',
    'ABANDONED',
    'POSTPONED'
);

-- ============================================================
-- Таблица: Пользователи (Profiles)
-- ============================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(100),
    photo_url TEXT,
    default_cover_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Таблица: Книги (Books)
-- ============================================================
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Основная информация
    title VARCHAR(500) NOT NULL,
    author VARCHAR(300) NOT NULL,
    year VARCHAR(10),
    cover_url TEXT,
    description TEXT,
    is_part_of_series BOOLEAN DEFAULT FALSE,
    
    -- Статус и оценка
    status book_status NOT NULL DEFAULT 'WANT_TO_READ',
    rating NUMERIC(3, 1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 10),
    
    -- Даты чтения
    start_date DATE,
    end_date DATE,
    
    -- Прогресс
    total_pages INTEGER CHECK (total_pages > 0),
    current_page INTEGER CHECK (current_page >= 0),
    current_percentage NUMERIC(5, 2) CHECK (current_percentage >= 0 AND current_percentage <= 100),
    
    -- Часы (базовое значение)
    total_hours NUMERIC(6, 1) CHECK (total_hours >= 0),
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для books
CREATE INDEX idx_books_user_profile ON books(user_profile_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_start_date ON books(start_date);
CREATE INDEX idx_books_end_date ON books(end_date);

-- ============================================================
-- Таблица: История смен статусов (Status History)
-- ============================================================
CREATE TABLE book_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_status book_status NOT NULL,
    new_status book_status NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для book_status_history
CREATE INDEX idx_status_history_book ON book_status_history(book_id);
CREATE INDEX idx_status_history_timestamp ON book_status_history(timestamp);

-- ============================================================
-- Таблица: Сессии чтения (Reading Sessions)
-- ============================================================
CREATE TABLE reading_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    
    -- Время сессии
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL CHECK (duration >= 0), -- в секундах
    
    -- Страницы
    start_page INTEGER CHECK (start_page >= 0),
    end_page INTEGER CHECK (end_page >= 0),
    pages_read INTEGER CHECK (pages_read >= 0),
    
    -- Проценты
    start_percentage NUMERIC(5, 2) CHECK (start_percentage >= 0 AND start_percentage <= 100),
    end_percentage NUMERIC(5, 2) CHECK (end_percentage >= 0 AND end_percentage <= 100),
    percentage_read NUMERIC(5, 2) CHECK (percentage_read >= 0 AND percentage_read <= 100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для reading_sessions
CREATE INDEX idx_sessions_book ON reading_sessions(book_id);
CREATE INDEX idx_sessions_start_time ON reading_sessions(start_time);
CREATE INDEX idx_sessions_end_time ON reading_sessions(end_time);

-- ============================================================
-- Триггеры для обновления updated_at
-- ============================================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для user_profiles
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Триггер для books
CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Представления (Views) для аналитики
-- ============================================================

-- Общая статистика по пользователю
CREATE VIEW user_statistics AS
SELECT 
    up.id AS user_profile_id,
    up.nickname,
    COUNT(b.id) AS total_books,
    COUNT(FILTER (WHERE b.status = 'READING')) AS reading_books,
    COUNT(FILTER (WHERE b.status = 'READ')) AS read_books,
    COUNT(FILTER (WHERE b.status = 'WANT_TO_READ')) AS to_read_books,
    COUNT(FILTER (WHERE b.status = 'ABANDONED')) AS abandoned_books,
    COUNT(FILTER (WHERE b.status = 'POSTPONED')) AS postponed_books,
    AVG(FILTER (WHERE b.rating > 0, b.rating)) AS average_rating,
    SUM(FILTER (WHERE b.total_hours IS NOT NULL, b.total_hours)) AS total_hours
FROM user_profiles up
LEFT JOIN books b ON up.id = b.user_profile_id
GROUP BY up.id, up.nickname;

-- Статистика по книгам с сессиями
CREATE VIEW book_reading_stats AS
SELECT 
    b.id AS book_id,
    b.title,
    b.author,
    b.status,
    b.rating,
    COUNT(rs.id) AS total_sessions,
    SUM(rs.duration) AS total_session_seconds,
    SUM(rs.duration) / 3600.0 AS total_session_hours,
    MAX(rs.end_time) AS last_session_date
FROM books b
LEFT JOIN reading_sessions rs ON b.id = rs.book_id
GROUP BY b.id, b.title, b.author, b.status, b.rating;

-- ============================================================
-- Примеры данных (для тестирования)
-- ============================================================

-- Вставка тестового пользователя
-- INSERT INTO user_profiles (nickname, photo_url, default_cover_url)
-- VALUES ('Анна', 'data:image/jpeg;base64,...', 'https://covers.example.com/default.jpg');

-- Вставка тестовой книги
-- INSERT INTO books (user_profile_id, title, author, year, cover_url, description, status, rating, start_date, end_date, total_pages, current_page, current_percentage, total_hours)
-- VALUES 
-- (
--     (SELECT id FROM user_profiles LIMIT 1),
--     'Война и мир',
--     'Лев Толстой',
--     '1869',
--     'https://covers.example.com/war-and-peace.jpg',
--     'Эпический роман о России во время войн с Наполеоном',
--     'READ',
--     9.0,
--     '2026-01-05',
--     '2026-02-20',
--     1200,
--     1200,
--     100.0,
--     45.5
-- );