package club.redline.web;

import org.springframework.http.HttpStatus;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> badRequest(RuntimeException error) {
        String message = error.getMessage();
        String localized = switch (message == null ? "" : message) {
            case "You cannot buy your own product" -> "Нельзя купить собственный товар";
            case "Product is not available" -> "Товар недоступен";
            case "Product is out of stock" -> "Товар закончился";
            case "Seller is temporarily not accepting orders" ->
                    "Продавец временно не принимает заказы";
            case "Invalid order status transition" -> "Этот этап заказа уже недоступен";
            case "Order status was already changed" -> "Статус заказа уже изменён";
            case "Group buy is no longer collecting reservations" ->
                    "Набор в эту закупку уже завершён";
            case "Reservation is not payable" -> "Эту бронь сейчас нельзя оплатить";
            case "Not all participants are marked as paid" ->
                    "Ещё не все участники подтвердили оплату";
            case "Category is not available" -> "Выбранная категория недоступна";
            case "Category name is required" -> "Введите название категории";
            case "Category was not created" -> "Не удалось создать категорию";
            case "Product not found or access denied" ->
                    "Товар не найден или у вас нет доступа";
            case "Telegram user is not initialized" ->
                    "Не удалось определить пользователя Telegram";
            case "Selected club is not available" -> "Выбранный клуб недоступен";
            case "Group owner access required" -> "Нужны права владельца группы";
            case "Group not found" -> "Группа не найдена";
            case "Product or group owner access not found" ->
                    "Товар не найден или нужны права владельца группы";
            case "Not a group buy seller" ->
                    "Управлять этой закупкой может только её продавец";
            case "Target must be at least 2" ->
                    "Для групповой закупки нужно минимум 2 участника";
            case "Registration is required" -> "Сначала завершите регистрацию";
            case "Super-admin access required" -> "Нужны права супер-администратора";
            case "Telegram initData is required" ->
                    "Откройте Mini App через кнопку Telegram-бота";
            case "Telegram hash is missing", "Invalid Telegram signature" ->
                    "Не удалось подтвердить вход через Telegram";
            case "Telegram initData has expired" ->
                    "Сессия Telegram истекла. Закройте и снова откройте Mini App";
            case "Invalid Telegram user payload" ->
                    "Telegram передал некорректные данные пользователя";
            case "Unable to validate Telegram signature" ->
                    "Не удалось проверить авторизацию Telegram";
            case "Image file is required" -> "Выберите фотографию";
            case "Image must not exceed 10 MB" -> "Фотография должна быть меньше 10 МБ";
            case "Only JPG, PNG and WEBP images are supported" ->
                    "Поддерживаются только JPG, PNG и WEBP";
            case "Unable to store image" -> "Не удалось сохранить фотографию";
            case "Invalid image path" -> "Некорректный путь фотографии";
            default -> message == null || message.isBlank()
                    ? "Не удалось выполнить действие"
                    : message;
        };
        return Map.of("message", localized);
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound() {
        return Map.of("message", "Запись не найдена");
    }
}
