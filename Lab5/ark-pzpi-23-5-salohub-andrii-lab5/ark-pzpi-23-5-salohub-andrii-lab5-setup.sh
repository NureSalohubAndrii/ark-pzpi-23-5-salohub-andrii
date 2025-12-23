#!/bin/bash

echo "РОЗГОРТАННЯ CAR HISTORY"

confirm() {
    read -p "$1 (y/n): " choice
    case "$choice" in 
      y|Y ) return 0;;
      * ) return 1;;
    esac
}

echo -e "\n[1/7] Перевірка Bun..."
if ! command -v bun &> /dev/null; then
    echo -e "Bun не знайдено!"
    echo -e "Він потрібен для роботи сервера. Встановити його можна командою:"
    echo -e "curl -fsSL https://bun.sh/install | bash"
    exit 1
else
    echo -e "Bun встановлено ($(bun -v))"
fi

echo -e "\n[2/7] Налаштування конфігурації..."
ENV_FILE="ark-pzpi-23-5-salohub-andrii-lab5-server/.development.env"

USE_LOCAL_DB=false

if [ -f "$ENV_FILE" ]; then
    echo -e "Файл .development.env вже існує"
    echo -e "\nПоточні налаштування:"
    echo -e "─────────────────────────────────────"
    
    if grep -q "DATABASE_URL" "$ENV_FILE"; then
        db_url=$(grep "DATABASE_URL" "$ENV_FILE" | cut -d'=' -f2)
        if [[ "$db_url" == *"localhost"* ]]; then
            echo -e "  DATABASE: Локальний Docker PostgreSQL"
            USE_LOCAL_DB=true
        else
            masked_url=$(echo "$db_url" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
            echo -e "  DATABASE: Зовнішня БД"
            echo -e "            ${masked_url}"
        fi
    fi
    
    if grep -q "JWT_SECRET" "$ENV_FILE"; then
        echo -e "  JWT_SECRET: встановлено"
    fi
    
    if grep -q "BREVO_USER" "$ENV_FILE"; then
        brevo_user=$(grep "BREVO_USER" "$ENV_FILE" | cut -d'=' -f2)
        echo -e "  BREVO_USER: ${brevo_user}"
    else
        echo -e "  BREVO_USER: не налаштовано"
    fi
    
    if grep -q "BREVO_FROM" "$ENV_FILE"; then
        brevo_from=$(grep "BREVO_FROM" "$ENV_FILE" | cut -d'=' -f2)
        echo -e "  BREVO_FROM: ${brevo_from}"
    else
        echo -e "  BREVO_FROM: не налаштовано"
    fi
    
    if grep -q "BREVO_SMTP_KEY" "$ENV_FILE"; then
        echo -e "  BREVO_SMTP_KEY: встановлено"
    else
        echo -e "  BREVO_SMTP_KEY: не налаштовано"
    fi
    
    echo -e "─────────────────────────────────────\n"
    
    if confirm "Бажаєте переналаштувати?"; then
        rm "$ENV_FILE"
    else
        if grep -q "localhost" "$ENV_FILE" 2>/dev/null; then
            USE_LOCAL_DB=true
        fi
    fi
fi

if [ ! -f "$ENV_FILE" ]; then
    echo -e "  НАЛАШТУВАННЯ БАЗИ ДАНИХ  "
    echo ""
    echo -e "  1) Локальний Docker PostgreSQL"
    echo -e "      Найпростіший варіант для розробки"
    echo -e "      Автоматичне налаштування"
    echo -e "      Потребує Docker"
    echo ""
    echo -e "  2) Зовнішня БД (Neon, Supabase, AWS RDS)"
    echo -e "      Готова хмарна база даних"
    echo -e "      Не потребує Docker"
    echo -e "      Швидший старт"
    echo ""
    read -p "Оберіть варіант (1/2) [1]: " db_choice
    db_choice=${db_choice:-1}
    
    if [ "$db_choice" = "1" ]; then
        USE_LOCAL_DB=true
        
        echo -e "\n  НАЛАШТУВАННЯ ЛОКАЛЬНОЇ БАЗИ ДАНИХ  "
        echo ""
        echo -e "  Спосіб налаштування:"
        echo -e "  1) Ввести повний URL з'єднання"
        echo -e "      Наприклад: postgresql://user:password@localhost:5432/db"
        echo -e "  2) Ввести параметри окремо (простий режим)"
        echo ""
        read -p "Оберіть спосіб налаштування (1/2) [2]: " config_method
        config_method=${config_method:-2}
        
        if [ "$config_method" = "1" ]; then
            echo -e "\nПриклад DATABASE_URL для локальної БД:"
            echo -e "postgresql://postgres:password@localhost:5432/car_history"
            echo ""
            read -p "Введіть DATABASE_URL: " db_url
            
            if [[ ! "$db_url" =~ ^postgresql:// ]]; then
                echo -e " Невірний формат URL. Має починатись з postgresql://"
                exit 1
            fi
            
            if [[ "$db_url" != *"localhost"* ]] && [[ "$db_url" != *"127.0.0.1"* ]]; then
                echo -e "Увага! URL не містить localhost або 127.0.0.1"
                echo -e "Якщо це зовнішня БД, краще обрати варіант 2 (Зовнішня БД)"
                if ! confirm "Все одно продовжити?"; then
                    exit 1
                fi
            fi
            echo -e "Буде використано локальну БД з наданим URL"
        else
            read -p "Порт для PostgreSQL [5432]: " db_port
            db_port=${db_port:-5432}
            
            read -p "Ім'я користувача [postgres]: " db_user
            db_user=${db_user:-postgres}
            
            read -p "Пароль для PostgreSQL [password]: " db_password
            db_password=${db_password:-password}
            
            read -p "Назва бази даних [car_history]: " db_name
            db_name=${db_name:-car_history}
            
            db_url="postgresql://${db_user}:${db_password}@localhost:${db_port}/${db_name}?sslmode=disable"
            echo -e "Буде використано локальний Docker PostgreSQL"
        fi
    else
        USE_LOCAL_DB=false
        
        echo -e "\n  НАЛАШТУВАННЯ ЗОВНІШНЬОЇ БАЗИ ДАНИХ  "
        echo ""
        echo -e "  Спосіб налаштування:"
        echo -e "  1) Ввести повний URL з'єднання"
        echo -e "      Наприклад: postgresql://user:password@aws.region.rds.amazonaws.com:5432/db"
        echo -e "  2) Ввести параметри окремо (для Neon/Supabase)"
        echo ""
        read -p "Оберіть спосіб налаштування (1/2) [1]: " config_method
        config_method=${config_method:-1}
        
        if [ "$config_method" = "1" ]; then
            echo -e "\nПриклади DATABASE_URL:"
            echo -e "  • Neon: postgresql://user:pass@ep-cool-darkness-123456.eu-central-1.aws.neon.tech/db"
            echo -e "  • Supabase: postgresql://postgres:pass@db.project.supabase.co:5432/postgres"
            echo -e "  • AWS RDS: postgresql://user:pass@database-1.123456.eu-central-1.rds.amazonaws.com:5432/db"
            echo ""
            read -p "Введіть DATABASE_URL: " db_url
            
            if [[ ! "$db_url" =~ ^postgresql:// ]]; then
                echo -e "Невірний формат URL. Має починатись з postgresql://"
                exit 1
            fi
            echo -e "Буде використано зовнішню БД"
        else
            echo -e "\nВведіть параметри підключення:"
            read -p "Хост (hostname): " db_host
            read -p "Порт [5432]: " db_port
            db_port=${db_port:-5432}
            read -p "Ім'я користувача: " db_user
            read -p "Пароль: " db_password
            read -p "Назва бази даних: " db_name
            read -p "Додаткові параметри (ssl, timeout тощо) [?sslmode=require]: " db_params
            db_params=${db_params:-"?sslmode=require"}
            
            if [[ "$db_params" != \?* ]]; then
                db_params="?${db_params}"
            fi
            
            db_url="postgresql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}${db_params}"
            echo -e "Згенеровано URL: $(echo $db_url | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
        fi
    fi
    
    echo -e "\n  НАЛАШТУВАННЯ БЕЗПЕКИ (JWT)  "
    echo -e ""
    read -p "Введіть JWT_SECRET [генерувати автоматично]: " jwt_secret
    if [ -z "$jwt_secret" ]; then
        jwt_secret="jwt_$(openssl rand -hex 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)"
        echo -e "✓ Згенеровано: ${jwt_secret:0:20}..."
    fi
    
    echo -e "\n  НАЛАШТУВАННЯ EMAIL (Brevo SMTP)  "
    echo -e ""
    echo -e "Ці налаштування потрібні для відправки листів"
    echo -e "(реєстрація, скидання паролю тощо)"
    echo -e "Можна налаштувати пізніше\n"
    
    read -p "Введіть BREVO_USER (або Enter щоб пропустити): " brevo_user
    read -p "Введіть BREVO_FROM (або Enter щоб пропустити): " brevo_from
    read -p "Введіть BREVO_SMTP_KEY (або Enter щоб пропустити): " brevo_key

    if [[ "$db_url" == *"localhost"* ]] || [[ "$db_url" == *"127.0.0.1"* ]]; then
        USE_LOCAL_DB=true
    fi

    cat <<EOF > "$ENV_FILE"
PORT=3000
DATABASE_URL=$db_url
JWT_SECRET=$jwt_secret
JWT_REFRESH_SECRET=refresh_$jwt_secret
EOF

    [ ! -z "$brevo_user" ] && echo "BREVO_USER=$brevo_user" >> "$ENV_FILE"
    [ ! -z "$brevo_from" ] && echo "BREVO_FROM=$brevo_from" >> "$ENV_FILE"
    [ ! -z "$brevo_key" ] && echo "BREVO_SMTP_KEY=$brevo_key" >> "$ENV_FILE"

    echo -e "\nФайл .development.env створено"
fi

if [ "$USE_LOCAL_DB" = true ]; then
    echo -e "\n[3/7] Перевірка Docker..."
    
    if ! command -v docker &> /dev/null; then
        echo -e "Docker не знайдено!"
        echo -e "Для локальної БД потрібен Docker Desktop:"
        echo -e "https://www.docker.com/products/docker-desktop/"
        echo -e "\nАльтернативно: використайте зовнішню БД (Neon, Supabase)"
        exit 1
    else
        echo -e "Docker знайдено"
        
        if ! docker info &> /dev/null; then
            echo -e "Docker встановлено, але НЕ запущений!"
            echo -e "Запустіть Docker Desktop і повторіть спробу"
            exit 1
        fi
        echo -e "Docker запущений"
    fi
else
    echo -e "\n[3/7] Перевірка Docker..."
    echo -e "✓ Пропущено (використовується зовнішня БД)"
fi

if [ "$USE_LOCAL_DB" = true ]; then
    echo -e "\n[4/7] Перевірка портів..."
    
    if [[ "$db_url" =~ :([0-9]+)/ ]]; then
        DB_PORT=${BASH_REMATCH[1]}
    else
        DB_PORT=5432
    fi
    
    echo -e "Використовується порт: ${DB_PORT}"
    
    if lsof -i :$DB_PORT &> /dev/null; then
        echo -e "Порт ${DB_PORT} вже зайнятий"
        
        if [ "$DB_PORT" = "5432" ]; then
            echo -e "Можливо, у вас запущений локальний PostgreSQL"

            if confirm "Спробувати звільнити порт?"; then
                if command -v brew &> /dev/null; then
                    brew services stop postgresql 2>/dev/null || true
                    brew services stop postgresql@15 2>/dev/null || true
                    brew services stop postgresql@14 2>/dev/null || true
                fi

                if command -v systemctl &> /dev/null; then
                    sudo systemctl stop postgresql 2>/dev/null || true
                fi

                if lsof -i :$DB_PORT &> /dev/null; then
                    echo -e "Завершення процесу..."
                    sudo lsof -ti:$DB_PORT | xargs kill -9 2>/dev/null || true
                fi

                sleep 2

                if lsof -i :$DB_PORT &> /dev/null; then
                    echo -e "Не вдалося звільнити порт"
                    echo -e "Змініть порт в .development.env або звільніть порт вручну"
                    exit 1
                else
                    echo -e "Порт звільнено"
                fi
            else
                echo -e "Продовжуємо з зайнятим портом (можуть бути помилки)"
            fi
        else
            echo -e "Увага! Використовується нестандартний порт: ${DB_PORT}"
            echo -e "Переконайтесь, що Docker контейнер буде запущений на цьому порті"
        fi
    else
        echo -e "✓ Порт ${DB_PORT} вільний"
    fi
else
    echo -e "\n[4/7] Перевірка портів..."
    echo -e "Пропущено (використовується зовнішня БД)"
fi

echo -e "\n[5/7] Встановлення залежностей..."
if confirm "Запустити bun install?"; then
    cd ark-pzpi-23-5-salohub-andrii-lab5-server && bun install
    cd ..
else
    echo -e "Пропущено. Запустіть вручну: cd ark-pzpi-23-5-salohub-andrii-lab5-server && bun install"
fi

if [ "$USE_LOCAL_DB" = true ]; then
    echo -e "\n[6/7] Запуск бази даних..."
    
    COMPOSE_PATH="docker-compose.yml"
    [ ! -f "$COMPOSE_PATH" ] && COMPOSE_PATH="ark-pzpi-23-5-salohub-andrii-lab5-server/docker-compose.yml"
    
    if [ ! -f "$COMPOSE_PATH" ]; then
        echo -e "Файл docker-compose.yml не знайдено!"
        exit 1
    fi
    
    docker rm -f car-history-db 2>/dev/null || true
    
    if confirm "Запустити PostgreSQL контейнер?"; then
        echo -e "Запуск PostgreSQL в Docker..."
        
        DB_USER=$(echo "$db_url" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
        DB_PASSWORD=$(echo "$db_url" | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_NAME=$(echo "$db_url" | sed -n 's/.*\/[^/]*\/\([^?]*\).*/\1/p')
        
        export POSTGRES_USER=${DB_USER:-postgres}
        export POSTGRES_PASSWORD=${DB_PASSWORD:-password}
        export POSTGRES_DB=${DB_NAME:-car_history}
        export POSTGRES_PORT=${DB_PORT:-5432}
        
        echo -e "Налаштування контейнера:"
        echo -e "  Користувач: ${POSTGRES_USER}"
        echo -e "  База даних: ${POSTGRES_DB}"
        echo -e "  Порт: ${POSTGRES_PORT}"
        
        docker-compose -f "$COMPOSE_PATH" up -d db
        
        echo -e "Очікування запуску PostgreSQL (до 30 сек)..."
        for i in {1..30}; do
            if docker exec car-history-db pg_isready -U ${POSTGRES_USER} &> /dev/null; then
                echo -e "PostgreSQL готовий!"
                break
            fi
            echo -n "."
            sleep 1
        done
        echo ""
        
        echo -e "Перевірка бази даних..."
        docker exec car-history-db psql -U ${POSTGRES_USER} -c "\l" 2>/dev/null | grep ${POSTGRES_DB} > /dev/null && \
            echo -e "База даних ${POSTGRES_DB} готова" || \
            echo -e "Не вдалося перевірити базу даних"
        
        echo -e "✓ База даних готова"
    fi
else
    echo -e "\n[6/7] Запуск бази даних..."
    echo -e "Пропущено (використовується зовнішня БД)"
    
    echo -e "\nПеревірка підключення до зовнішньої БД..."
    if command -v psql &> /dev/null; then
        if confirm "Перевірити підключення до БД?"; then
            temp_file=$(mktemp)
            echo "\q" | timeout 10 psql "$db_url" 2>&1 > "$temp_file"
            
            if [ $? -eq 0 ]; then
                echo -e "Підключення до БД успішне"
            else
                echo -e "Не вдалося підключитись до БД"
                echo -e "Повідомлення: $(cat $temp_file | head -5)"
                echo -e "\nПеревірте:"
                echo -e "  • Чи правильний URL"
                echo -e "  • Чи доступний хост з вашого комп'ютера"
                echo -e "  • Чи правильні дані для входу"
                echo -e "  • Чи дозволено підключення з вашої IP-адреси"
            fi
            rm "$temp_file"
        fi
    else
        echo -e "Утиліта psql не встановлена, перевірка підключення недоступна"
        echo -e "Встановіть PostgreSQL client:"
        echo -e "  Ubuntu: sudo apt-get install postgresql-client"
        echo -e "  macOS: brew install postgresql"
    fi
fi

echo -e "\n[7/7] Синхронізація таблиць..."
if confirm "Синхронізувати структуру БД через Drizzle?"; then
    cd ark-pzpi-23-5-salohub-andrii-lab5-server && bun run db:push:dev
    cd ..
else
    echo -e "Пропущено. Запустіть вручну: cd car-history_server && bun run db:push:dev"
fi

echo -e "  УСПІШНО ЗАВЕРШЕНО!  "

echo -e "\nКонфігурація:"
echo -e "  - База даних: $([ "$USE_LOCAL_DB" = true ] && echo "Локальна БД (Docker)" || echo "Зовнішня БД")"
echo -e "  - DATABASE_URL: $(echo $db_url | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')"
echo -e "  - Конфігураційний файл: ark-pzpi-23-5-salohub-andrii-lab5-server/.development.env"

if [ "$USE_LOCAL_DB" = true ]; then
    echo -e "\nКорисні команди для Docker:"
    echo -e "  - Зупинити БД:     docker stop car-history-db"
    echo -e "  - Запустити БД:    docker start car-history-db"
    echo -e "  - Логи БД:         docker logs car-history-db"
    echo -e "  - Підключитись:    docker exec -it car-history-db psql -U postgres -d car_history"
    echo -e "  - Інформація:      docker inspect car-history-db"
else
    echo -e "\nКорисні команди для зовнішньої БД:"
    echo -e "  - Тест підключення: psql \"$db_url\""
    echo -e "  - Перелік таблиць:  psql \"$db_url\" -c \"\\dt\""
fi

echo -e "\nЗапуск сервера:"
if confirm "Запустити сервер зараз?"; then
    cd ark-pzpi-23-5-salohub-andrii-lab5-server && bun run dev
else
    echo -e "  cd ark-pzpi-23-5-salohub-andrii-lab5-server && bun run dev"
fi
