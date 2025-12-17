import { Response, NextFunction } from 'express';
import { EventsService } from './events.service';
import { AuthRequest } from '../../shared/middlewares/auth.middleware';
import { ApiResponse } from '../../shared/types/response.type';

const eventsService = new EventsService();

export class EventsController {
  async createEvent(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const { eventDate, ...rest } = req.body;

      const parsedEventDate = new Date(eventDate);

      const event = await eventsService.createEvent({
        ...rest,
        eventDate: parsedEventDate,
        reportedBy: req.userId,
      });

      res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCarEvents(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const filters = {
        eventType: req.query.eventType as string,
        severity: req.query.severity as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const events = await eventsService.getCarEvents(req.params.carId, filters);

      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateEvent(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      const event = await eventsService.updateEvent(req.params.eventId, req.body);

      res.json({
        success: true,
        data: event,
        message: 'Event updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteEvent(req: AuthRequest, res: Response<ApiResponse>, next: NextFunction) {
    try {
      await eventsService.deleteEvent(req.params.eventId);

      res.json({
        success: true,
        message: 'Event deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
