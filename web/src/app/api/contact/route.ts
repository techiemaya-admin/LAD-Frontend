import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with MongoDB for production)
const submissions: any[] = [];

interface ContactSubmission {
  name: string;
  email: string;
  message: string;
  company?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactSubmission = await request.json();
    const { name, email, message, company } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!name?.trim()) {
      errors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }

    if (!message?.trim()) {
      errors.message = 'Message is required';
    } else if (message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors,
        },
        { status: 400 }
      );
    }

    // Create submission object
    const submission = {
      id: `contact-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      company: company?.trim() || null,
      message: message.trim(),
      createdAt: new Date().toISOString(),
      source: request.headers.get('referer') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Store in memory (TODO: Save to MongoDB)
    submissions.push(submission);

    // Log for debugging
    console.log('New contact form submission:', submission);

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to user
    // Example: await sendEmailNotification(submission);

    return NextResponse.json(
      {
        success: true,
        message: 'Form submitted successfully',
        data: {
          id: submission.id,
          createdAt: submission.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Contact form submission error:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to process submission',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for admin token in query params (for security)
    const token = request.nextUrl.searchParams.get('token');
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken || token !== adminToken) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact form submissions',
      count: submissions.length,
      data: submissions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve submissions',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, token } = body;

    // Verify admin token
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken || token !== adminToken) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete submission
    const index = submissions.findIndex((s) => s.id === id);
    if (index === -1) {
      return NextResponse.json(
        { message: 'Submission not found' },
        { status: 404 }
      );
    }

    submissions.splice(index, 1);

    return NextResponse.json({
      success: true,
      message: 'Submission deleted',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to delete submission',
      },
      { status: 500 }
    );
  }
}
